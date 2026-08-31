/**
 * Penyusun data untuk Halaman B — halaman verifikasi publik.
 *
 * HANYA DIJALANKAN DI SERVER, dan HANYA membaca salinan tersimpan di
 * SQLite. Tidak ada panggilan ke RDAP, e.id, atau pembacaan sertifikat
 * saat halaman dibuka — halaman ini akan dibuka berulang kali di depan
 * juri dan pengunjung, dan menembak API pihak ketiga tiap kali berarti
 * lambat dan berisiko kena batas laju.
 *
 * Pemisahan PUBLIK vs INTERNAL mengikuti CLAUDE.md. Yang dikembalikan
 * fungsi ini adalah yang boleh tampil. holder_did, session_id,
 * credentialStatus, issuer, issuanceDate, dan retrieved_at sengaja TIDAK
 * ikut — bukan karena disembunyikan di UI, tapi karena tidak dibawa
 * sampai ke sana.
 */

import { ambilDb } from "./db.ts";
import { normalisasiDomain } from "./dcv.ts";

export type TingkatPublik = "identitas" | "kontak" | null;

export type DataPublik = {
  domain: string;
  terdaftar: boolean;

  /** Pilar 1 — kepemilikan domain */
  domainTerbukti: boolean;
  domainTerbuktiPada: string | null;

  /** Pilar 2 — identitas pemilik */
  tingkat: TingkatPublik;
  nama: string | null;
  verificator: string | null;
  email: string | null;
  telepon: string | null;

  /** Pilar 3 — sertifikat SSL. Belum tersimpan; tempatnya disediakan. */
  ssl: {
    ada: boolean;
    jenisValidasi: "DV" | "OV" | null;
    penerbit: string | null;
    organisasi: string | null;
  };

  /** Detail sekunder — RDAP. Belum tersimpan; tempatnya disediakan. */
  rdap: {
    ada: boolean;
    tanggalRegistrasi: string | null;
    registrar: string | null;
  };

  /** Waktu pemeriksaan terakhir yang diketahui, dari sumber mana pun. */
  diperiksaTerakhir: string | null;
};

const terbaru = (...waktu: (string | null | undefined)[]): string | null => {
  const sah = waktu.filter(Boolean) as string[];
  if (sah.length === 0) return null;
  return sah.reduce((a, b) => (new Date(a) > new Date(b) ? a : b));
};

export function bacaDataPublik(domainMentah: string): DataPublik {
  const domain = normalisasiDomain(domainMentah);
  const db = ambilDb();

  const kosong: DataPublik = {
    domain,
    terdaftar: false,
    domainTerbukti: false,
    domainTerbuktiPada: null,
    tingkat: null,
    nama: null,
    verificator: null,
    email: null,
    telepon: null,
    ssl: { ada: false, jenisValidasi: null, penerbit: null, organisasi: null },
    rdap: { ada: false, tanggalRegistrasi: null, registrar: null },
    diperiksaTerakhir: null,
  };

  const d: any = db.prepare("SELECT * FROM domain WHERE domain = ?").get(domain);
  if (!d || d.dcv_status !== "terbukti") return kosong;

  const baris: any[] = db
    .prepare("SELECT * FROM identitas WHERE domain = ?")
    .all(domain);
  const kontak = baris.find((b) => b.tingkat === "kontak") ?? null;
  const diri = baris.find((b) => b.tingkat === "identitas") ?? null;

  // Tingkat yang dinyatakan adalah yang tertinggi yang benar-benar terbukti.
  const tingkat: TingkatPublik = diri ? "identitas" : kontak ? "kontak" : null;

  return {
    ...kosong,
    terdaftar: true,
    domainTerbukti: true,
    domainTerbuktiPada: d.dcv_terbukti_pada ?? null,

    tingkat,
    nama: diri?.fullname ?? null,
    verificator: diri?.verificator ?? null,
    // Kontak usaha memang untuk dipublikasikan: pembeli bisa mencocokkannya
    // dengan kontak yang tertera di toko. Kalau berbeda, itu tanda bahaya.
    email: kontak?.email ?? null,
    telepon: kontak?.phone_number ?? null,

    diperiksaTerakhir: terbaru(
      d.dcv_terbukti_pada,
      d.dcv_diperiksa_pada,
      kontak?.dibuat_pada,
      diri?.dibuat_pada,
    ),
  };
}
