/**
 * Mengambil data dari sumber luar (RDAP dan sertifikat TLS) lalu
 * MENYIMPANNYA ke SQLite.
 *
 * HANYA DIJALANKAN DI SERVER, dan hanya pada saat pendaftaran atau
 * penyegaran yang disengaja, tidak pernah saat halaman dibuka.
 * Halaman B akan dibuka berulang kali di depan juri dan pengunjung;
 * menembak RDAP tiap kali berarti lambat dan berisiko kena batas laju.
 */

import { ambilDb } from "./db.ts";
import { ambilRdap } from "./rdap.ts";
import { ambilSertifikat } from "./sertifikat.ts";

export type SumberTersimpan = {
  rdap: {
    ada: boolean;
    tanggalRegistrasi: string | null;
    tanggalKedaluwarsa: string | null;
    registrar: string | null;
    diperiksaPada: string | null;
    galat: string | null;
  };
  ssl: {
    ada: boolean;
    jenisValidasi: "DV" | "OV" | null;
    organisasi: string | null;
    penerbit: string | null;
    penerbitOrganisasi: string | null;
    berlakuSampai: string | null;
    tepercaya: boolean | null;
    diperiksaPada: string | null;
    galat: string | null;
  };
};

/**
 * Panggil RDAP dan baca sertifikat, lalu simpan hasilnya.
 *
 * Kegagalan salah satu tidak membatalkan yang lain: kalau situsnya belum
 * punya sertifikat, catatan registrinya tetap tersimpan, dan sebaliknya.
 * Alasan kegagalan ikut dicatat supaya bisa ditelusuri.
 */
export async function segarkanSumberLuar(domain: string): Promise<SumberTersimpan> {
  const [rdap, ssl] = await Promise.all([
    ambilRdap(domain).catch((e) => ({ ok: false, galat: String(e?.message || e) }) as any),
    ambilSertifikat(domain).catch((e) => ({ ok: false, galat: String(e?.message || e) }) as any),
  ]);

  const sekarang = new Date().toISOString();

  ambilDb()
    .prepare(
      `INSERT OR REPLACE INTO sumber_luar
        (domain,
         rdap_ok, rdap_registrasi, rdap_kedaluwarsa, rdap_registrar, rdap_diperiksa, rdap_galat,
         ssl_ok, ssl_jenis, ssl_organisasi, ssl_penerbit, ssl_penerbit_org,
         ssl_berlaku_sampai, ssl_tepercaya, ssl_diperiksa, ssl_galat)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .run(
      domain,
      rdap.ok ? 1 : 0,
      rdap.tanggalRegistrasi ?? null,
      rdap.tanggalKedaluwarsa ?? null,
      rdap.namaRegistrar ?? null,
      sekarang,
      rdap.galat ?? null,
      ssl.ok ? 1 : 0,
      ssl.jenisValidasi ?? null,
      ssl.namaOrganisasi ?? null,
      ssl.penerbit ?? null,
      ssl.penerbitOrganisasi ?? null,
      ssl.berlakuSampai ?? null,
      ssl.tepercaya === null || ssl.tepercaya === undefined ? null : ssl.tepercaya ? 1 : 0,
      sekarang,
      ssl.galat ?? null,
    );

  return bacaSumberLuar(domain);
}

export function bacaSumberLuar(domain: string): SumberTersimpan {
  const r: any = ambilDb()
    .prepare("SELECT * FROM sumber_luar WHERE domain = ?")
    .get(domain);

  if (!r) {
    return {
      rdap: { ada: false, tanggalRegistrasi: null, tanggalKedaluwarsa: null, registrar: null, diperiksaPada: null, galat: null },
      ssl: { ada: false, jenisValidasi: null, organisasi: null, penerbit: null, penerbitOrganisasi: null, berlakuSampai: null, tepercaya: null, diperiksaPada: null, galat: null },
    };
  }

  return {
    rdap: {
      ada: r.rdap_ok === 1,
      tanggalRegistrasi: r.rdap_registrasi ?? null,
      tanggalKedaluwarsa: r.rdap_kedaluwarsa ?? null,
      registrar: r.rdap_registrar ?? null,
      diperiksaPada: r.rdap_diperiksa ?? null,
      galat: r.rdap_galat ?? null,
    },
    ssl: {
      ada: r.ssl_ok === 1,
      jenisValidasi: (r.ssl_jenis as "DV" | "OV") ?? null,
      organisasi: r.ssl_organisasi ?? null,
      penerbit: r.ssl_penerbit ?? null,
      penerbitOrganisasi: r.ssl_penerbit_org ?? null,
      berlakuSampai: r.ssl_berlaku_sampai ?? null,
      tepercaya: r.ssl_tepercaya === null ? null : r.ssl_tepercaya === 1,
      diperiksaPada: r.ssl_diperiksa ?? null,
      galat: r.ssl_galat ?? null,
    },
  };
}
