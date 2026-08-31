/**
 * Perapian tampilan. Tidak mengubah data tersimpan — hanya cara
 * menuliskannya di layar.
 *
 * Nilai aslinya tetap utuh di basis data. Kalau bentuk masukan tidak
 * dikenali, ditampilkan apa adanya daripada dirusak.
 */

/**
 * Nomor telepon Indonesia jadi bentuk lokal yang enak dibaca.
 *   628561700647 -> 0856-1700-647
 *
 * Nomor negara lain atau bentuk tak dikenal dikembalikan apa adanya.
 */
export function rapikanTelepon(nomor: string | null): string | null {
  if (!nomor) return nomor;
  const angka = String(nomor).replace(/[^\d]/g, "");
  if (!angka) return nomor;

  let lokal: string;
  if (angka.startsWith("62")) lokal = "0" + angka.slice(2);
  else if (angka.startsWith("0")) lokal = angka;
  else return nomor; // bukan bentuk Indonesia yang kita kenali

  if (lokal.length < 9 || lokal.length > 14) return nomor;

  // 0856 1700 647 -> kelompok 4-4-sisa
  const a = lokal.slice(0, 4);
  const b = lokal.slice(4, 8);
  const c = lokal.slice(8);
  return c ? `${a}-${b}-${c}` : `${a}-${b}`;
}

/**
 * Nama yang datang HURUF KAPITAL SEMUA dari e.id ditulis ulang dengan
 * kapitalisasi biasa, supaya tidak terbaca seperti berteriak.
 *
 * Nama yang sudah bercampur huruf besar-kecil TIDAK disentuh — pemiliknya
 * mungkin memang menulisnya begitu.
 */
export function rapikanNama(nama: string | null): string | null {
  if (!nama) return nama;
  const t = nama.trim();
  if (!t) return nama;

  // Hanya bertindak kalau memang seluruhnya kapital.
  if (t !== t.toUpperCase() || !/[A-Z]/.test(t)) return nama;

  return t
    .toLowerCase()
    .split(/(\s+)/)
    .map((bagian) =>
      /\s/.test(bagian)
        ? bagian
        : bagian.replace(/^([a-z])/, (m) => m.toUpperCase()),
    )
    .join("");
}

/** Nama lembaga pemverifikasi: "privy" -> "Privy". */
export function rapikanVerificator(v: string | null): string | null {
  if (!v) return v;
  const peta: Record<string, string> = { privy: "Privy", vida: "VIDA" };
  return peta[v.toLowerCase()] ?? v;
}
