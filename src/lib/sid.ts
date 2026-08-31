/**
 * Tautan pendek s.id untuk bio media sosial.
 *
 * HANYA DIJALANKAN DI SERVER. Kunci API tidak pernah sampai ke browser.
 *
 * ⚠️ Batas s.id: 38 permintaan per menit. Tautan dibuat SEKALI saat
 * pendaftaran lalu disimpan ke SQLite. Halaman A membaca dari salinan itu
 * dan tidak pernah memanggil s.id lagi.
 *
 * Kegagalan membuat tautan TIDAK boleh menghalangi apa pun. Tautan pendek
 * adalah kenyamanan, bukan bukti. halaman verifikasi tetap bisa dibuka
 * lewat alamat panjangnya.
 */

import { ambilDb } from "./db.ts";

const API = "https://api.s.id/v2/links";

const kunci = () => process.env.S_ID_API_KEY || process.env.SID_API_KEY || "";

/**
 * Saklar untuk mematikan permintaan ke s.id, dipakai saat mengembangkan di
 * laptop. Setiap tautan yang terlanjur dibuat memakai satu slug yang tidak
 * bisa dipakai ulang, jadi percobaan berulang di lokal ikut menghabiskan
 * nama slug di akun yang sama dengan produksi.
 */
const dimatikan = () => process.env.SID_MATIKAN === "1";
const alamatAplikasi = () =>
  (process.env.APP_BASE_URL || "https://cekusaha.id").replace(/\/+$/, "");

export type Aset = {
  domain: string;
  sidUrl: string | null;
  sidSlug: string | null;
  sidDibuat: string | null;
  sidGalat: string | null;
};

export function bacaAset(domain: string): Aset {
  const r: any = ambilDb().prepare("SELECT * FROM aset WHERE domain = ?").get(domain);
  return {
    domain,
    sidUrl: r?.sid_url ?? null,
    sidSlug: r?.sid_slug ?? null,
    sidDibuat: r?.sid_dibuat ?? null,
    sidGalat: r?.sid_galat ?? null,
  };
}

/** Alamat halaman verifikasi publik untuk sebuah domain. */
export function alamatVerifikasi(domain: string): string {
  return `${alamatAplikasi()}/v/${encodeURIComponent(domain)}`;
}

/** Slug yang diusulkan: nama domain tanpa titik. */
function usulSlug(domain: string): string {
  return domain.replace(/[^a-z0-9]/gi, "").slice(0, 30).toLowerCase();
}

/**
 * Cari alamat tautan pendek di dalam respons s.id.
 *
 * Bentuk yang sebenarnya, diperiksa langsung pada 31 Agustus 2026:
 *   { "code": 200, "message": "link_created",
 *     "data": { "short": "...", "short_url": "https://s.id/...", ... } }
 *
 * Tempat lain tetap ikut diperiksa sebagai cadangan kalau bentuknya berubah.
 */
function cariUrlPendek(j: any): string | null {
  const kandidat = [
    j?.data?.short_url, j?.data?.shortUrl, j?.data?.url, j?.data?.link,
    j?.short_url, j?.shortUrl, j?.url, j?.link,
  ];
  const ketemu = kandidat.find((x) => typeof x === "string" && /^https?:\/\//.test(x));
  return ketemu ?? null;
}

/**
 * Buat tautan pendek satu kali. Kalau sudah ada, kembalikan yang tersimpan
 * tanpa memanggil s.id lagi.
 */
export async function pastikanTautanPendek(domain: string): Promise<Aset> {
  const ada = bacaAset(domain);
  if (ada.sidUrl) return ada;

  const sekarang = new Date().toISOString();
  const simpan = (url: string | null, slug: string | null, galat: string | null) => {
    ambilDb()
      .prepare(
        `INSERT OR REPLACE INTO aset (domain, sid_url, sid_slug, sid_dibuat, sid_galat)
         VALUES (?,?,?,?,?)`,
      )
      .run(domain, url, slug, sekarang, galat);
    return bacaAset(domain);
  };

  if (dimatikan())
    return simpan(null, null, "Permintaan s.id dimatikan lewat SID_MATIKAN.");

  if (!kunci()) return simpan(null, null, "Kunci API s.id belum diisi.");

  const coba = async (slug: string) => {
    const r = await fetch(API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${kunci()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        long_url: alamatVerifikasi(domain),
        custom_slug: slug,
      }),
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    });
    const j: any = await r.json().catch(() => ({}));
    return { status: r.status, pesan: String(j?.message ?? ""), url: cariUrlPendek(j), j };
  };

  const slug = usulSlug(domain);
  try {
    let h = await coba(slug);
    let slugDipakai = slug;

    // Slug bentrok. nama domain ini sudah dipakai orang lain di s.id, atau
    // sisa percobaan sebelumnya. Coba sekali lagi dengan akhiran acak
    // daripada membiarkan pendaftaran gagal karena hal sepele.
    if (!h.url && h.pesan === "short_already_exist") {
      slugDipakai = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
      h = await coba(slugDipakai);
    }

    if (h.url) return simpan(h.url, slugDipakai, null);

    return simpan(
      null,
      slugDipakai,
      `s.id menjawab HTTP ${h.status}: ${JSON.stringify(h.j).slice(0, 300)}`,
    );
  } catch (err: any) {
    return simpan(null, slug, `Tidak bisa menghubungi s.id: ${err?.message || err}`);
  }
}
