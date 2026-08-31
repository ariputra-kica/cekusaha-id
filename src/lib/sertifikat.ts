/**
 * Pembacaan sertifikat TLS langsung dari koneksi ke domain.
 *
 * HANYA DIJALANKAN DI SERVER. Modul `node:tls` memang tidak ada di browser.
 *
 * Batas keyakinan — dibaca sebelum memakai hasilnya:
 *
 *   DV vs OV  → DAPAT DIPASTIKAN. Ada tidaknya field Organization (O) pada
 *               subject sertifikat adalah pembeda yang benar dan baku.
 *
 *   OV vs EV  → TIDAK DIPASTIKAN. Penanda EV yang sah ada di ekstensi
 *               certificatePolicies, dan Node tidak membukanya lewat API.
 *               Fungsi ini hanya mencari pola byte kode kebijakan CA/Browser
 *               Forum di dalam sertifikat mentah. Itu pencarian kasar, bukan
 *               pembacaan struktur yang semestinya. Hasilnya ditaruh di
 *               `petunjukEv` dan JANGAN dipakai sebagai kesimpulan.
 *
 * Peramban modern sendiri sudah menghapus indikator EV, jadi membedakan OV
 * dan EV bukan kebutuhan produk.
 */

import tls from "node:tls";

export type HasilSertifikat = {
  ok: boolean;
  domain: string;
  galat?: string;

  /** Kesimpulan yang boleh dipakai: "DV" atau "OV". */
  jenisValidasi: "DV" | "OV" | null;
  namaOrganisasi: string | null;
  penerbit: string | null;
  penerbitOrganisasi: string | null;
  subjectCN: string | null;

  berlakuMulai: string | null;
  berlakuSampai: string | null;
  masihBerlaku: boolean | null;

  /** Rantai tepercaya menurut daftar CA bawaan Node. */
  tepercaya: boolean | null;
  galatKepercayaan: string | null;

  /** TIDAK DIPASTIKAN — lihat catatan di atas berkas. */
  petunjukEv: {
    kodeKebijakanDitemukan: string | null;
    catatan: string;
  };

  diperiksaPada: string;
};

/**
 * Kode kebijakan CA/Browser Forum, dalam bentuk byte seperti tersimpan di
 * sertifikat. Dicari sebagai pola mentah, bukan hasil pembacaan struktur.
 */
const KODE_KEBIJAKAN: { nama: string; pola: Buffer }[] = [
  { nama: "EV (2.23.140.1.1)",  pola: Buffer.from([0x06, 0x05, 0x67, 0x81, 0x0c, 0x01, 0x01]) },
  { nama: "DV (2.23.140.1.2.1)", pola: Buffer.from([0x06, 0x06, 0x67, 0x81, 0x0c, 0x01, 0x02, 0x01]) },
  { nama: "OV (2.23.140.1.2.2)", pola: Buffer.from([0x06, 0x06, 0x67, 0x81, 0x0c, 0x01, 0x02, 0x02]) },
  { nama: "IV (2.23.140.1.2.3)", pola: Buffer.from([0x06, 0x06, 0x67, 0x81, 0x0c, 0x01, 0x02, 0x03]) },
];

function cariKodeKebijakan(mentah: Buffer | undefined): string | null {
  if (!mentah || !Buffer.isBuffer(mentah)) return null;
  for (const k of KODE_KEBIJAKAN) {
    if (mentah.includes(k.pola)) return k.nama;
  }
  return null;
}

export function ambilSertifikat(
  domain: string,
  timeoutMs = 15000,
): Promise<HasilSertifikat> {
  const dasar: HasilSertifikat = {
    ok: false,
    domain,
    jenisValidasi: null,
    namaOrganisasi: null,
    penerbit: null,
    penerbitOrganisasi: null,
    subjectCN: null,
    berlakuMulai: null,
    berlakuSampai: null,
    masihBerlaku: null,
    tepercaya: null,
    galatKepercayaan: null,
    petunjukEv: { kodeKebijakanDitemukan: null, catatan: "tidak dipastikan" },
    diperiksaPada: new Date().toISOString(),
  };

  return new Promise((resolve) => {
    let sudah = false;
    const selesai = (h: HasilSertifikat) => {
      if (sudah) return;
      sudah = true;
      try { sock.destroy(); } catch {}
      resolve(h);
    };

    const sock = tls.connect(
      {
        host: domain,
        port: 443,
        servername: domain,
        // Sengaja tidak menolak sertifikat bermasalah: kita ingin tetap bisa
        // MEMBACA sertifikatnya, lalu melaporkan status kepercayaannya apa
        // adanya lewat `tepercaya`.
        rejectUnauthorized: false,
        timeout: timeoutMs,
      },
      () => {
        try {
          const c: any = sock.getPeerCertificate(true);
          if (!c || !c.subject) {
            return selesai({ ...dasar, galat: "sertifikat tidak terbaca" });
          }

          const org = c.subject.O ?? null;
          const sampai = c.valid_to ? new Date(c.valid_to) : null;
          const mulai = c.valid_from ? new Date(c.valid_from) : null;
          const galatKepercayaan = (sock as any).authorizationError;

          selesai({
            ...dasar,
            ok: true,
            jenisValidasi: org ? "OV" : "DV",
            namaOrganisasi: org,
            penerbit: c.issuer?.CN ?? null,
            penerbitOrganisasi: c.issuer?.O ?? null,
            subjectCN: c.subject?.CN ?? null,
            berlakuMulai: mulai ? mulai.toISOString() : null,
            berlakuSampai: sampai ? sampai.toISOString() : null,
            masihBerlaku: sampai ? sampai.getTime() > Date.now() : null,
            tepercaya: sock.authorized,
            galatKepercayaan: galatKepercayaan
              ? String(galatKepercayaan)
              : null,
            petunjukEv: {
              kodeKebijakanDitemukan: cariKodeKebijakan(c.raw),
              catatan:
                "Hasil pencarian pola byte, bukan pembacaan struktur sertifikat. Jangan dipakai sebagai kesimpulan.",
            },
            diperiksaPada: new Date().toISOString(),
          });
        } catch (err: any) {
          selesai({ ...dasar, galat: err?.message || String(err) });
        }
      },
    );

    sock.on("timeout", () =>
      selesai({ ...dasar, galat: `waktu habis setelah ${timeoutMs} ms` }),
    );
    sock.on("error", (err: any) =>
      selesai({ ...dasar, galat: err?.message || String(err) }),
    );
  });
}
