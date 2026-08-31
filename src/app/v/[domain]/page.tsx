import type { Metadata } from "next";
import { bacaDataPublik } from "@/lib/publik";

const KONTAK_LAPORAN = process.env.KONTAK_LAPORAN || "laporan@cekusaha.id";

function tanggal(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function tanggalJam(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string }>;
}): Promise<Metadata> {
  const { domain } = await params;
  const nama = decodeURIComponent(domain);
  return {
    title: `${nama} — verifikasi cekusaha.id`,
    description: `Apa yang sudah dibuktikan tentang ${nama}, dan apa yang belum.`,
  };
}

export default async function VerifikasiPublik({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const d = bacaDataPublik(decodeURIComponent(domain));

  /* ---------------- Belum terdaftar ----------------
     Bahasa sengaja netral. Sebagian besar domain memang belum mendaftar;
     menyiratkan kecurigaan berarti memfitnah usaha yang jujur. */
  if (!d.terdaftar) {
    return (
      <article className="halamanB">
        <p className="eyebrow">Halaman verifikasi</p>
        <h1 className="namaDomain">{d.domain}</h1>
        <p className="ikhtisar ikhtisar--netral">
          Belum terverifikasi di cekusaha.id
        </p>
        <p className="ikhtisarKeterangan">
          Kami belum punya catatan verifikasi untuk domain ini. Itu bukan
          tanda ada yang salah — sebagian besar domain memang belum mendaftar.
        </p>

        <p className="ajakan">
          Pemilik domain ini?{" "}
          <a href={`/daftar?domain=${encodeURIComponent(d.domain)}`}>
            Buktikan kepemilikannya
          </a>
        </p>

        <Penutup />
      </article>
    );
  }

  const ikhtisar =
    d.tingkat === "identitas"
      ? "Identitas pemilik terverifikasi"
      : d.tingkat === "kontak"
        ? "Kontak pemilik terverifikasi"
        : "Kepemilikan domain terbukti";

  return (
    <article className="halamanB">
      <p className="eyebrow">Halaman verifikasi</p>
      <h1 className="namaDomain">{d.domain}</h1>
      <p className="ikhtisar ikhtisar--terbukti">{ikhtisar}</p>

      {/* ---------- Tiga pilar ----------
          Baris yang dipisah garis tipis. Bukan kartu, bukan ikon dalam
          kotak, bukan centang berdiri sendiri. */}
      <div className="pilar">
        {/* Pilar 1 */}
        <section className="pilarBaris">
          <div className="pilarKepala">
            <h2>Kepemilikan domain</h2>
            <span className="status status--verified">Terbukti</span>
          </div>
          <p className="pilarIsi">
            Pemilik membuktikan kendali atas domain ini dengan memasang
            catatan DNS yang kami minta
            {d.domainTerbuktiPada ? ` pada ${tanggal(d.domainTerbuktiPada)}` : ""}.
          </p>
        </section>

        {/* Pilar 2 */}
        <section className="pilarBaris">
          <div className="pilarKepala">
            <h2>Identitas pemilik</h2>
            {d.tingkat ? (
              <span className="status status--verified">
                {d.tingkat === "identitas"
                  ? "Identitas Terverifikasi"
                  : "Kontak Terverifikasi"}
              </span>
            ) : (
              <span className="status status--pending">Belum</span>
            )}
          </div>

          {d.tingkat === null && (
            <p className="pilarIsi">
              Pemilik belum menautkan identitas terverifikasi.
            </p>
          )}

          {d.tingkat === "kontak" && (
            <p className="pilarIsi">
              Email dan nomor telepon pemilik sudah diverifikasi lewat e.id.
              Identitas perorangannya belum diverifikasi.
            </p>
          )}

          {d.tingkat === "identitas" && (
            <p className="pilarIsi">
              Identitas pemilik diverifikasi hingga tingkat Penyelenggara
              Sertifikasi Elektronik lewat e.id.
            </p>
          )}

          {(d.nama || d.verificator || d.email || d.telepon) && (
            <dl className="rincian">
              {d.nama && (
                <div>
                  <dt>Nama pemilik</dt>
                  <dd>{d.nama}</dd>
                </div>
              )}
              {d.verificator && (
                <div>
                  <dt>Diperiksa oleh</dt>
                  <dd>{d.verificator}</dd>
                </div>
              )}
              {d.email && (
                <div>
                  <dt>Email</dt>
                  <dd>{d.email}</dd>
                </div>
              )}
              {d.telepon && (
                <div>
                  <dt>Telepon</dt>
                  <dd>{d.telepon}</dd>
                </div>
              )}
            </dl>
          )}

          {(d.email || d.telepon) && (
            <p className="pilarCatatan">
              Cocokkan kontak ini dengan yang tertera di toko. Kalau berbeda,
              berhati-hatilah.
            </p>
          )}
        </section>

        {/* Pilar 3 — DV dan OV diberi bobot visual yang sama. Ketiadaan
            nama organisasi bukan sinyal negatif. */}
        <section className="pilarBaris">
          <div className="pilarKepala">
            <h2>Sertifikat situs</h2>
            {d.ssl.ada ? (
              <span className="status status--verified">
                {d.ssl.jenisValidasi === "OV"
                  ? "Organisasi tervalidasi"
                  : "Domain tervalidasi"}
              </span>
            ) : (
              <span className="status status--pending">Belum diperiksa</span>
            )}
          </div>

          {d.ssl.ada ? (
            <dl className="rincian">
              {d.ssl.organisasi && (
                <div>
                  <dt>Organisasi</dt>
                  <dd>{d.ssl.organisasi}</dd>
                </div>
              )}
              <div>
                <dt>Penerbit</dt>
                <dd>{d.ssl.penerbit}</dd>
              </div>
            </dl>
          ) : (
            <p className="pilarIsi">
              Pembacaan sertifikat belum tersimpan untuk domain ini.
            </p>
          )}
        </section>
      </div>

      {/* ---------- Detail sekunder, sengaja kalem ---------- */}
      <section className="sekunder">
        <h2>Catatan pendaftaran domain</h2>
        {d.rdap.ada ? (
          <dl className="rincian rincian--kalem">
            <div>
              <dt>Terdaftar sejak</dt>
              <dd>{tanggal(d.rdap.tanggalRegistrasi)}</dd>
            </div>
            <div>
              <dt>Registrar</dt>
              <dd>{d.rdap.registrar}</dd>
            </div>
          </dl>
        ) : (
          <p className="sekunderIsi">
            Catatan registri belum tersimpan untuk domain ini.
          </p>
        )}
        <p className="sekunderIsi">
          Registrar adalah penyedia jasa pendaftaran domain, bukan pemilik
          domain.
        </p>
      </section>

      <p className="waktuPeriksa">
        Seluruh data di halaman ini berasal dari salinan tersimpan.
        {d.diperiksaTerakhir
          ? ` Pemeriksaan terakhir ${tanggalJam(d.diperiksaTerakhir)}.`
          : ""}
      </p>

      <Penutup />
    </article>
  );
}

function Penutup() {
  return (
    <footer className="penutupB">
      <p>
        Setiap pernyataan di halaman ini berasal dari pemeriksaan yang bisa
        ditunjuk sumbernya: catatan DNS untuk kepemilikan domain, kredensial
        e.id untuk identitas, dan sertifikat situs untuk enkripsi. Kami tidak
        menampilkan apa pun yang tidak kami periksa sendiri.
      </p>
      <p>
        Menemukan penyalahgunaan halaman ini?{" "}
        <a href={`mailto:${KONTAK_LAPORAN}`}>Laporkan kepada kami</a>.
      </p>
    </footer>
  );
}
