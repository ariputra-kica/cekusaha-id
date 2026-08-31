/**
 * QR code menuju halaman verifikasi publik sebuah domain.
 *
 * Dihasilkan sebagai SVG, bukan PNG: QR ini akan DICETAK di kemasan dan
 * etalase, dan SVG tetap tajam di ukuran berapa pun.
 *
 * Isinya alamat verifikasi lengkap, bukan tautan pendek — supaya tetap
 * berfungsi meski layanan pemendek sedang bermasalah, dan supaya orang
 * yang melihat alamatnya tahu ke mana ia menuju.
 *
 * Domain yang belum terbukti tidak punya QR, sama seperti seal.
 */

import QRCode from "qrcode-svg";
import { bacaDataPublik } from "@/lib/publik";
import { alamatVerifikasi } from "@/lib/sid";

export async function GET(
  permintaan: Request,
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

  const url = new URL(permintaan.url);
  const unduh = url.searchParams.get("unduh") === "1";
  const ukuran = Math.min(
    2048,
    Math.max(160, Number(url.searchParams.get("ukuran")) || 512),
  );

  const svg = new QRCode({
    content: alamatVerifikasi(d.domain),
    width: ukuran,
    height: ukuran,
    padding: 3,
    // Hitam di atas putih, bukan warna merek: kontras penuh adalah yang
    // paling andal dipindai, apalagi setelah dicetak dan sedikit kotor.
    color: "#000000",
    background: "#ffffff",
    // Q menahan sampai 25% kerusakan — kemasan tergores atau terlipat
    // masih terbaca.
    ecl: "Q",
    join: true,
    container: "svg-viewbox",
  }).svg();

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      ...(unduh
        ? {
            "Content-Disposition": `attachment; filename="cekusaha-${d.domain}.svg"`,
          }
        : {}),
    },
  });
}
