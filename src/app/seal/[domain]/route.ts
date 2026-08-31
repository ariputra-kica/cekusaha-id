/**
 * Gambar seal untuk dipasang di situs pemilik.
 *
 * Bukan infrastruktur semat: tidak ada skrip, tidak ada CORS, tidak ada
 * panggilan balik. Hanya satu berkas gambar yang dibaca dari salinan
 * tersimpan, dibungkus tautan biasa oleh pemiliknya.
 *
 * Seal WAJIB menyebut tingkat yang benar-benar terbukti. Menuliskan
 * "Terverifikasi" tanpa kualifikasi untuk tingkat Kontak berarti
 * menyatakan lebih dari yang dibuktikan.
 *
 * Domain yang belum terbukti tidak punya seal sama sekali. Bukan seal
 * kosong, bukan seal "belum". Gambar yang tidak ada tidak bisa dipalsukan.
 */

import { bacaDataPublik } from "@/lib/publik";

const lolos = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function GET(
  _permintaan: Request,
  { params }: { params: Promise<{ domain: string }> },
) {
  const { domain } = await params;
  const d = bacaDataPublik(decodeURIComponent(domain));

  if (!d.terdaftar || !d.domainTerbukti) {
    return new Response("Domain ini belum terverifikasi di cekusaha.id.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const tingkat =
    d.tingkat === "identitas"
      ? "IDENTITAS TERVERIFIKASI"
      : d.tingkat === "kontak"
        ? "KONTAK TERVERIFIKASI"
        : "KEPEMILIKAN DOMAIN TERBUKTI";

  // Lebar mengikuti panjang teks terpanjang supaya tidak terpotong.
  const lebar = Math.max(
    236,
    Math.round(Math.max(tingkat.length * 6.4 + 46, d.domain.length * 8.2 + 118)),
  );
  const tinggi = 62;

  /* Huruf memakai keluarga bawaan sistem: berkas ini dimuat lewat <img>
     di situs orang lain, sehingga font web tidak ikut termuat. */
  const huruf =
    "system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${lebar}" height="${tinggi}" viewBox="0 0 ${lebar} ${tinggi}" role="img" aria-label="${lolos(d.domain)}, ${lolos(tingkat)} di cekusaha.id">
  <rect width="${lebar}" height="${tinggi}" rx="3" fill="#1b2733"/>
  <circle cx="17" cy="23" r="3.5" fill="#4fb489"/>
  <text x="28" y="26.5" font-family="${huruf}" font-size="9.5" font-weight="600" letter-spacing="1.05" fill="#7cc9a8">${lolos(tingkat)}</text>
  <text x="16" y="47" font-family="${huruf}" font-size="14.5" font-weight="600" fill="#ffffff">${lolos(d.domain)}</text>
  <text x="${lebar - 14}" y="47" text-anchor="end" font-family="${huruf}" font-size="10" fill="#8a95a3">cekusaha.id</text>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // Disimpan sebentar di sisi pengunjung; status bisa berubah kalau
      // pemilik menaikkan tingkat verifikasinya.
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
