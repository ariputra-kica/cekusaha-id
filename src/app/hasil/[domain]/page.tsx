import { bacaDataPublik } from "@/lib/publik";
import { bacaAset, alamatVerifikasi } from "@/lib/sid";
import { aksiBuatTautanPendek } from "../actions";
import TombolSalin from "../TombolSalin";
import TombolKirim from "../../daftar/TombolKirim";

const ALAMAT = (process.env.APP_BASE_URL || "https://cekusaha.id").replace(/\/+$/, "");

export const metadata = {
  title: "Hasil pendaftaran cekusaha.id",
  robots: { index: false, follow: false },
};

export default async function HasilPemilik({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain: mentah } = await params;
  const d = bacaDataPublik(decodeURIComponent(mentah));
  const aset = bacaAset(d.domain);

  const tautanVerifikasi = alamatVerifikasi(d.domain);
  const tautanSeal = `${ALAMAT}/seal/${encodeURIComponent(d.domain)}`;
  // Baris sengaja dibuat pendek supaya muat di kolomnya tanpa terpotong
  // di tengah kata. Atribut target dan rel dilepas karena tidak wajib.
  const kodeSemat =
    `<a href="${tautanVerifikasi}">\n` +
    `  <img src="${tautanSeal}"\n` +
    `       alt="Terverifikasi di cekusaha.id" height="62">\n` +
    `</a>`;

  if (!d.terdaftar || !d.domainTerbukti) {
    return (
      <div className="halamanA">
        <p className="eyebrow">Halaman pemilik</p>
        <h1 className="hasilJudul">{d.domain}</h1>
        <p className="lead">
          Domain ini belum selesai didaftarkan, jadi belum ada aset yang bisa
          dipakai.
        </p>
        <p className="ajakan">
          <a href={`/daftar?domain=${encodeURIComponent(d.domain)}`}>
            Lanjutkan pendaftaran
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="halamanA">
      <p className="eyebrow">Halaman pemilik</p>
      <p className="peringatanPrivat">
        Jangan dibagikan. Siapa pun yang tahu alamat ini bisa membukanya.
      </p>
      <h1 className="hasilJudul">{d.domain}</h1>
      <p className="lead">
        Pendaftaran selesai. Tiga aset di bawah ini semuanya menuju halaman
        verifikasi publik yang sama, dan boleh dipakai di mana saja.
      </p>

      <p className="tautanUtama">
        <a href={`/v/${encodeURIComponent(d.domain)}`}>
          Lihat halaman verifikasi publik Anda
        </a>
      </p>

      {/* ---- Ajakan naik tingkat. HANYA di halaman pemilik, tidak pernah
              di halaman publik yang dilihat konsumen. ---- */}
      {d.tingkat === "kontak" && (
        <section className="naikTingkat">
          <h2>Naikkan ke Identitas Terverifikasi</h2>
          <p>
            Sekarang halaman Anda menyatakan bahwa kontak Anda terverifikasi.
            Dengan menautkan identitas perorangan lewat e.id, halaman itu bisa
            menyebut nama Anda dan lembaga yang memeriksanya.
          </p>
          <p className="naikTingkatAksi">
            <a href={`/daftar?domain=${encodeURIComponent(d.domain)}`}>
              Lanjutkan di halaman pendaftaran
            </a>
          </p>
        </section>
      )}

      <div className="aset">
        {/* ---- 1. QR ---- */}
        <section className="asetBaris">
          <h2 className="asetLabel">QR code</h2>
          <p className="asetGuna">
            Untuk dicetak dan ditempel di kemasan, etalase, atau kartu nama.
          </p>
          <div className="qrBlok">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="qrGambar"
              src={`/qr/${encodeURIComponent(d.domain)}?ukuran=512`}
              alt={`QR menuju halaman verifikasi ${d.domain}`}
              width={196}
              height={196}
            />
            <p className="qrUnduh">
              <a href={`/qr/${encodeURIComponent(d.domain)}?ukuran=1024&unduh=1`}>
                Unduh untuk dicetak (SVG)
              </a>
            </p>
          </div>
        </section>

        {/* ---- 2. Tautan pendek ---- */}
        <section className="asetBaris">
          <h2 className="asetLabel">Tautan pendek</h2>
          <p className="asetGuna">
            Untuk bio Instagram, TikTok, atau WhatsApp Business.
          </p>

          {aset.sidUrl ? (
            <div className="asetKotak">
              <code className="asetNilai">{aset.sidUrl}</code>
              <TombolSalin teks={aset.sidUrl} />
            </div>
          ) : (
            <>
              <div className="asetKotak asetKotak--tunggu">
                <p>
                  {aset.sidGalat
                    ? "Tautan pendek belum berhasil dibuat. Coba lagi, atau lewati saja. Aset lain tetap berfungsi."
                    : "Tautan pendek belum dibuat."}
                </p>
              </div>
              <form action={aksiBuatTautanPendek} className="formBaris">
                <input type="hidden" name="domain" value={d.domain} />
                <TombolKirim
                  label={aset.sidGalat ? "Coba buat lagi" : "Buat tautan pendek"}
                  labelSedang="Membuat…"
                />
              </form>
            </>
          )}

        </section>

        {/* ---- 3. Seal + kode semat ---- */}
        <section className="asetBaris">
          <h2 className="asetLabel">Seal untuk situs Anda</h2>
          <p className="asetGuna">
            Tempel kode ini di situs Anda. Tidak ada skrip yang perlu dipasang.
          </p>

          <p className="pratinjauSeal">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/seal/${encodeURIComponent(d.domain)}`}
              alt={`${d.domain} terverifikasi di cekusaha.id`}
              height={62}
            />
          </p>

          <div className="asetKotak asetKotak--kode">
            <pre>{kodeSemat}</pre>
            <TombolSalin teks={kodeSemat} />
          </div>
        </section>
      </div>

    </div>
  );
}
