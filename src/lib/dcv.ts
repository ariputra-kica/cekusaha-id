/**
 * Validasi kepemilikan domain lewat DNS TXT (Domain Control Validation).
 *
 * HANYA DIJALANKAN DI SERVER.
 *
 * Cara kerja, sengaja meniru DCV yang dipakai Certificate Authority:
 *   1. Aplikasi menerbitkan token acak untuk sebuah domain
 *   2. Pemilik memasangnya sebagai TXT record di domainnya
 *   3. Aplikasi membaca TXT record itu lewat SATU kueri DNS
 *
 * Token bersifat FANA. Begitu kepemilikan terbukti, token dikosongkan dari
 * basis data, sudah tidak berguna, dan menyimpannya hanya menambah risiko.
 *
 * Alur TIDAK menunggu propagasi dalam satu tarikan napas. Status "menunggu"
 * disimpan, dan pemilik menekan "Cek ulang" kapan pun dia siap.
 */

import { randomBytes } from "node:crypto";
import dnsPromises from "node:dns/promises";
import { ambilDb } from "./db.ts";

/** Awalan pada nilai TXT, supaya tidak tertukar dengan record lain. */
export const AWALAN_TXT = "cekusaha-id-verification=";

export type StatusDcv = "menunggu" | "terbukti";

/** Kode hasil pemeriksaan, dipakai antarmuka untuk memilih kalimat. */
export type KodeHasil =
  | "terbukti"
  | "sudah-terbukti"
  | "belum-ada-txt"
  | "belum-cocok"
  | "gagal-dns"
  | "tidak-terdaftar";

export type KeadaanDcv = {
  domain: string;
  status: StatusDcv;
  /** Hanya terisi saat status "menunggu". NULL setelah terbukti. */
  token: string | null;
  /** Baris TXT lengkap yang harus dipasang pemilik. NULL setelah terbukti. */
  nilaiTxt: string | null;
  dibuatPada: string;
  terbuktiPada: string | null;
  diperiksaPada: string | null;
  /** Diisi hanya oleh periksaDcv(), untuk ditampilkan sekali. */
  kode?: KodeHasil;
  pesan?: string;
  txtTerbaca?: string[];
};

/** Rapikan masukan pengguna jadi nama domain telanjang. */
export function normalisasiDomain(masukan: string): string {
  return String(masukan || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split("?")[0]
    .replace(/\.$/, "")
    .trim();
}

export function domainMasukAkal(domain: string): boolean {
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(
    domain,
  );
}

function barisKeKeadaan(r: any): KeadaanDcv {
  let txt: string[] = [];
  try {
    txt = r.dcv_txt_terbaca ? JSON.parse(r.dcv_txt_terbaca) : [];
  } catch {
    txt = [];
  }
  return {
    domain: r.domain,
    status: r.dcv_status,
    token: r.dcv_token ?? null,
    nilaiTxt: r.dcv_token ? AWALAN_TXT + r.dcv_token : null,
    dibuatPada: r.dcv_dibuat_pada,
    terbuktiPada: r.dcv_terbukti_pada ?? null,
    diperiksaPada: r.dcv_diperiksa_pada ?? null,
    kode: r.dcv_kode_terakhir ?? undefined,
    txtTerbaca: txt,
  };
}

/** Catat hasil satu pemeriksaan supaya halaman bisa menampilkannya. */
function catatPemeriksaan(
  domain: string,
  kode: KodeHasil,
  txt: string[],
  waktu: string,
) {
  ambilDb()
    .prepare(
      `UPDATE domain
          SET dcv_diperiksa_pada = ?, dcv_kode_terakhir = ?, dcv_txt_terbaca = ?
        WHERE domain = ?`,
    )
    .run(waktu, kode, JSON.stringify(txt), domain);
}

/**
 * Mulai (atau lanjutkan) proses pembuktian untuk sebuah domain.
 *
 * Token TIDAK dibuat ulang bila sudah ada dan masih menunggu. kalau
 * dibuat ulang, TXT record yang sudah terlanjur dipasang pemilik jadi
 * tidak cocok lagi.
 */
export function mulaiDcv(domainMentah: string): KeadaanDcv {
  const domain = normalisasiDomain(domainMentah);
  const db = ambilDb();

  const ada: any = db
    .prepare("SELECT * FROM domain WHERE domain = ?")
    .get(domain);

  if (ada) return barisKeKeadaan(ada);

  const token = randomBytes(16).toString("hex");
  const sekarang = new Date().toISOString();

  db.prepare(
    `INSERT INTO domain (domain, dcv_token, dcv_status, dcv_dibuat_pada)
     VALUES (?, ?, 'menunggu', ?)`,
  ).run(domain, token, sekarang);

  return {
    domain,
    status: "menunggu",
    token,
    nilaiTxt: AWALAN_TXT + token,
    dibuatPada: sekarang,
    terbuktiPada: null,
    diperiksaPada: null,
  };
}

export function bacaKeadaan(domainMentah: string): KeadaanDcv | null {
  const domain = normalisasiDomain(domainMentah);
  const r: any = ambilDb()
    .prepare("SELECT * FROM domain WHERE domain = ?")
    .get(domain);
  return r ? barisKeKeadaan(r) : null;
}

/** Pembaca TXT. Dipisah supaya logika pencocokan bisa diuji tanpa jaringan. */
export type PembacaTxt = (domain: string) => Promise<string[]>;

/** Gabungkan potongan satu TXT record jadi satu baris utuh. */
function rapikan(hasil: string[][]): string[] {
  return hasil.map((potongan) => potongan.join(""));
}

/**
 * Cara lama: bertanya ke resolver perantara (bawaan sistem).
 * Dipakai hanya sebagai cadangan. jawabannya bisa berasal dari cache.
 */
export const bacaTxtLewatResolver: PembacaTxt = async (domain) => {
  const r = new dnsPromises.Resolver({ timeout: 5000, tries: 2 });
  return rapikan(await r.resolveTxt(domain));
};

/** Galat yang berarti "sudah dijawab, memang tidak ada record". */
const JAWABAN_KOSONG = new Set(["ENODATA", "ENOTFOUND"]);

/**
 * Cara utama: bertanya LANGSUNG ke server DNS resmi domain itu.
 *
 * Kenapa begini, bukan lewat resolver biasa: resolver perantara menyimpan
 * jawaban "tidak ada record" selama masa yang ditentukan SOA. di Cloudflare
 * 30 menit. Jadi kalau pemilik memasang TXT sesudah kita pernah bertanya,
 * jawabannya tetap kosong sampai setengah jam meski recordnya sudah ada.
 *
 * Bertanya ke server resmi melewati seluruh cache itu. Cara ini pula yang
 * dipakai Certificate Authority saat memvalidasi kepemilikan domain.
 *
 * Ongkosnya: butuh 2-3 kueri, bukan satu.
 */
export const bacaTxtDariOtoritatif: PembacaTxt = async (domain) => {
  const dasar = new dnsPromises.Resolver({ timeout: 5000, tries: 2 });

  const namaNs = await dasar.resolveNs(domain);
  const alamat: string[] = [];
  for (const n of namaNs) {
    try {
      alamat.push(...(await dasar.resolve4(n)));
    } catch {
      // satu NS tidak terjawab bukan masalah selama ada yang lain
    }
  }
  if (alamat.length === 0) {
    throw Object.assign(new Error("server resmi domain tidak terjangkau"), {
      code: "ENOAUTHNS",
    });
  }

  const resmi = new dnsPromises.Resolver({ timeout: 5000, tries: 2 });
  resmi.setServers(alamat);
  return rapikan(await resmi.resolveTxt(domain));
};

/**
 * Pembaca yang dipakai aplikasi: coba server resmi dulu, mundur ke resolver
 * biasa hanya bila jalurnya benar-benar terhalang (jaringan, bukan jawaban).
 */
export const bacaTxtLewatDns: PembacaTxt = async (domain) => {
  try {
    return await bacaTxtDariOtoritatif(domain);
  } catch (err: any) {
    // "Tidak ada record" dari server resmi adalah jawaban FINAL, bukan
    // kegagalan. Jangan mundur ke resolver. jawabannya cuma cache lama.
    if (JAWABAN_KOSONG.has(err?.code)) return [];
    return await bacaTxtLewatResolver(domain);
  }
};

/**
 * Periksa apakah TXT record yang benar sudah terpasang.
 * Dipanggil oleh tombol "Cek ulang", bukan otomatis berulang.
 */
export async function periksaDcv(
  domainMentah: string,
  baca: PembacaTxt = bacaTxtLewatDns,
): Promise<KeadaanDcv> {
  const domain = normalisasiDomain(domainMentah);
  const db = ambilDb();
  const sekarang = new Date().toISOString();

  const r: any = db.prepare("SELECT * FROM domain WHERE domain = ?").get(domain);
  if (!r) {
    return {
      domain,
      status: "menunggu",
      token: null,
      nilaiTxt: null,
      dibuatPada: sekarang,
      terbuktiPada: null,
      diperiksaPada: sekarang,
      kode: "tidak-terdaftar",
      pesan: "Domain ini belum didaftarkan.",
    };
  }

  // Sudah terbukti sebelumnya, tidak perlu diperiksa lagi.
  if (r.dcv_status === "terbukti") {
    return { ...barisKeKeadaan(r), kode: "sudah-terbukti", pesan: "Kepemilikan sudah terbukti." };
  }

  let txt: string[] = [];
  try {
    txt = await baca(domain);
  } catch (err: any) {
    const kode = err?.code || err?.message || String(err);
    const kodeHasil: KodeHasil =
      kode === "ENOTFOUND" || kode === "ENODATA" ? "belum-ada-txt" : "gagal-dns";
    catatPemeriksaan(domain, kodeHasil, [], sekarang);
    const pesan =
      kode === "ENOTFOUND" || kode === "ENODATA"
        ? "Belum ada TXT record yang terbaca. Kalau baru dipasang, tunggu beberapa menit lalu cek ulang."
        : `Kueri DNS gagal (${kode}). Coba cek ulang sebentar lagi.`;
    return {
      ...barisKeKeadaan(r),
      diperiksaPada: sekarang,
      kode: kodeHasil,
      pesan,
      txtTerbaca: [],
    };
  }

  const dicari = AWALAN_TXT + r.dcv_token;
  const cocok = txt.some((baris) => baris.trim() === dicari);

  if (!cocok) {
    const kodeHasil: KodeHasil = txt.length === 0 ? "belum-ada-txt" : "belum-cocok";
    catatPemeriksaan(domain, kodeHasil, txt, sekarang);
    return {
      ...barisKeKeadaan(r),
      diperiksaPada: sekarang,
      kode: kodeHasil,
      pesan:
        txt.length === 0
          ? "Domain ini belum punya TXT record sama sekali."
          : "TXT record ditemukan, tapi belum ada yang cocok dengan token Anda.",
      txtTerbaca: txt,
    };
  }

  // Terbukti. Token dikosongkan. sifatnya fana.
  db.prepare(
    `UPDATE domain
        SET dcv_status = 'terbukti',
            dcv_token = NULL,
            dcv_terbukti_pada = ?,
            dcv_diperiksa_pada = ?,
            dcv_kode_terakhir = 'terbukti',
            dcv_txt_terbaca = ?
      WHERE domain = ?`,
  ).run(sekarang, sekarang, JSON.stringify(txt), domain);

  const baru: any = db.prepare("SELECT * FROM domain WHERE domain = ?").get(domain);
  return {
    ...barisKeKeadaan(baru),
    kode: "terbukti",
    pesan: "Kepemilikan terbukti. Token sudah dihapus dari basis data.",
    txtTerbaca: txt,
  };
}
