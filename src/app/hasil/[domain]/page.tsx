import { bacaDataPublik } from "@/lib/publik";
import { bacaAset, alamatVerifikasi } from "@/lib/sid";
import { aksiBuatTautanPendek } from "../actions";
import TombolSalin from "../TombolSalin";
import TombolKirim from "../../daftar/TombolKirim";

const ALAMAT = (process.env.APP_BASE_URL || "https://cekusaha.id").replace(/\/+$/, "");

export const metadata = {
  title: "Hasil pendaftaran — cekusaha.id",
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
  const kodeSemat =
    `<a href="${tautanVerifikasi}" target="_blank" rel="noopener">\n` +
    `  <img src="${tautanSeal}"\n` +
    `       alt="${d.domain} terverifikasi di cekusaha.id"\n` +
    `       height="62">\n` +
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
      <p className="eyebrow">Halaman pemilik — jangan dibagikan</p>
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
          <div className="asetKotak asetKotak--tunggu">
            <p>
              Belum dipasang. Menggambar QR memerlukan satu pustaka tambahan,
              dan itu menunggu persetujuan pemilik proyek.
            </p>
            <p className="asetKecil">
              Sementara itu, alamat yang akan dimuat QR ini adalah tautan
              verifikasi di bawah.
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
                    ? "Tautan pendek belum berhasil dibuat. Anda tetap bisa memakai alamat lengkapnya di bawah."
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

          <div className="asetKotak asetKotak--sunyi">
            <code className="asetNilai">{tautanVerifikasi}</code>
            <TombolSalin teks={tautanVerifikasi} />
          </div>
          <p className="asetKecil">
            Alamat lengkap ini selalu berfungsi, dengan atau tanpa tautan
            pendek.
          </p>
        </section>

        {/* ---- 3. Seal + kode semat ---- */}
        <section className="asetBaris">
          <h2 className="asetLabel">Seal untuk situs Anda</h2>
          <p className="asetGuna">
            Gambar yang bisa diklik, menuju halaman verifikasi Anda.
          </p>

          <p className="pratinjauSeal">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/seal/${encodeURIComponent(d.domain)}`}
              alt={`${d.domain} terverifikasi di cekusaha.id`}
              height={62}
            />
          </p>

          <p className="asetKecil">
            Salin kode ini dan tempel di halaman situs Anda. Tidak ada skrip
            yang perlu dipasang.
          </p>
          <div className="asetKotak asetKotak--kode">
            <pre>{kodeSemat}</pre>
            <TombolSalin teks={kodeSemat} />
          </div>
          <p className="asetKecil">
            Seal ini menyebut tingkat yang benar-benar terbukti. Kalau nanti
            Anda naik tingkat, gambarnya ikut berubah sendiri — kode di situs
            Anda tidak perlu diganti.
          </p>
        </section>
      </div>

      <p className="note">
        Halaman ini tidak terdaftar di mesin pencari, tapi siapa pun yang tahu
        alamatnya bisa membukanya. Jangan dibagikan.
      </p>
    </div>
  );
}
