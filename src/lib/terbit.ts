/**
 * Menyimpan pendaftaran dan menerbitkan halaman publik sebuah domain.
 *
 * HANYA DIJALANKAN DI SERVER.
 *
 * Syaratnya dua: kepemilikan domain terbukti, dan minimal Kontak
 * Terverifikasi. Identitas Terverifikasi sengaja TIDAK diwajibkan.
 * Kontak adalah tingkat masuk, dan menuntut identitas di depan pintu
 * berarti kehilangan pemilik usaha yang belum siap menyerahkan
 * identitasnya di hari pertama.
 */

import { ambilDb } from "./db.ts";
import { bacaIdentitas } from "./eid.ts";
import { pastikanTautanPendek } from "./sid.ts";

export type HasilTerbit = {
  bisa: boolean;
  sudah: boolean;
  diterbitkanPada: string | null;
  alasan: string | null;
};

/** Apakah domain ini sudah memenuhi syarat untuk diterbitkan? */
export function keadaanTerbit(domain: string): HasilTerbit {
  const d: any = ambilDb()
    .prepare("SELECT dcv_status, diterbitkan_pada FROM domain WHERE domain = ?")
    .get(domain);

  if (!d) {
    return { bisa: false, sudah: false, diterbitkanPada: null, alasan: "Domain ini belum didaftarkan." };
  }
  if (d.dcv_status !== "terbukti") {
    return { bisa: false, sudah: false, diterbitkanPada: null, alasan: "Kepemilikan domain belum terbukti." };
  }
  if (!bacaIdentitas(domain, "kontak")) {
    return {
      bisa: false,
      sudah: false,
      diterbitkanPada: null,
      alasan: "Kontak Terverifikasi belum selesai.",
    };
  }
  return {
    bisa: true,
    sudah: Boolean(d.diterbitkan_pada),
    diterbitkanPada: d.diterbitkan_pada ?? null,
    alasan: null,
  };
}

/**
 * Simpan dan terbitkan. Tautan pendek dibuat SEKALI di sini, bukan saat
 * halaman hasil dibuka.
 *
 * Kegagalan s.id tidak menggagalkan penerbitan: tautan pendek adalah
 * kenyamanan, bukan bukti. Halaman hasil menyediakan tombol coba lagi
 * sebagai cadangan.
 */
export async function terbitkan(domain: string): Promise<HasilTerbit> {
  const keadaan = keadaanTerbit(domain);
  if (!keadaan.bisa) return keadaan;

  if (!keadaan.sudah) {
    ambilDb()
      .prepare("UPDATE domain SET diterbitkan_pada = ? WHERE domain = ?")
      .run(new Date().toISOString(), domain);
  }

  try {
    await pastikanTautanPendek(domain);
  } catch {
    // Sudah dicatat sebagai galat di tabel aset. Penerbitan tetap sah.
  }

  return keadaanTerbit(domain);
}
