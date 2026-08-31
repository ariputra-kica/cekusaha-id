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
 * basis data — sudah tidak berguna, dan menyimpannya hanya menambah risiko.
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
  return {
    domain: r.domain,
    status: r.dcv_status,
    token: r.dcv_token ?? null,
    nilaiTxt: r.dcv_token ? AWALAN_TXT + r.dcv_token : null,
    dibuatPada: r.dcv_dibuat_pada,
    terbuktiPada: r.dcv_terbukti_pada ?? null,
    diperiksaPada: r.dcv_diperiksa_pada ?? null,
  };
}

/**
 * Mulai (atau lanjutkan) proses pembuktian untuk sebuah domain.
 *
 * Token TIDAK dibuat ulang bila sudah ada dan masih menunggu — kalau
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

/** Pembaca sungguhan: satu kueri DNS lewat modul bawaan Node. */
export const bacaTxtLewatDns: PembacaTxt = async (domain) => {
  const r = new dnsPromises.Resolver({ timeout: 5000, tries: 2 });
  const hasil = await r.resolveTxt(domain);
  // Satu TXT record bisa terpecah jadi beberapa potong; gabungkan.
  return hasil.map((potongan) => potongan.join(""));
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

  // Sudah terbukti sebelumnya — tidak perlu diperiksa lagi.
  if (r.dcv_status === "terbukti") {
    return { ...barisKeKeadaan(r), kode: "sudah-terbukti", pesan: "Kepemilikan sudah terbukti." };
  }

  let txt: string[] = [];
  try {
    txt = await baca(domain);
  } catch (err: any) {
    const kode = err?.code || err?.message || String(err);
    db.prepare("UPDATE domain SET dcv_diperiksa_pada = ? WHERE domain = ?").run(
      sekarang,
      domain,
    );
    const pesan =
      kode === "ENOTFOUND" || kode === "ENODATA"
        ? "Belum ada TXT record yang terbaca. Kalau baru dipasang, tunggu beberapa menit lalu cek ulang."
        : `Kueri DNS gagal (${kode}). Coba cek ulang sebentar lagi.`;
    return {
      ...barisKeKeadaan(r),
      diperiksaPada: sekarang,
      kode: kode === "ENOTFOUND" || kode === "ENODATA" ? "belum-ada-txt" : "gagal-dns",
      pesan,
      txtTerbaca: [],
    };
  }

  const dicari = AWALAN_TXT + r.dcv_token;
  const cocok = txt.some((baris) => baris.trim() === dicari);

  if (!cocok) {
    db.prepare("UPDATE domain SET dcv_diperiksa_pada = ? WHERE domain = ?").run(
      sekarang,
      domain,
    );
    return {
      ...barisKeKeadaan(r),
      diperiksaPada: sekarang,
      kode: txt.length === 0 ? "belum-ada-txt" : "belum-cocok",
      pesan:
        txt.length === 0
          ? "Domain ini belum punya TXT record sama sekali."
          : "TXT record ditemukan, tapi belum ada yang cocok dengan token Anda.",
      txtTerbaca: txt,
    };
  }

  // Terbukti. Token dikosongkan — sifatnya fana.
  db.prepare(
    `UPDATE domain
        SET dcv_status = 'terbukti',
            dcv_token = NULL,
            dcv_terbukti_pada = ?,
            dcv_diperiksa_pada = ?
      WHERE domain = ?`,
  ).run(sekarang, sekarang, domain);

  const baru: any = db.prepare("SELECT * FROM domain WHERE domain = ?").get(domain);
  return {
    ...barisKeKeadaan(baru),
    kode: "terbukti",
    pesan: "Kepemilikan terbukti. Token sudah dihapus dari basis data.",
    txtTerbaca: txt,
  };
}
