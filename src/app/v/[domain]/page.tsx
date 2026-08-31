import type { Metadata } from "next";
import { bacaDataPublik } from "@/lib/publik";
import { rapikanNama, rapikanTelepon, rapikanVerificator } from "@/lib/tampilan";

const KONTAK_LAPORAN = process.env.KONTAK_LAPORAN || "abuse@cekusaha.id";

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
    title: `Verifikasi ${nama} di cekusaha.id`,
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
      <article className="halamanB halamanB--kosong">
        <header className="kepalaB">
          <p className="eyebrow">Halaman verifikasi</p>
          <h1 className="putusanGabung">
            <span className="putusanDomain">{d.domain}</span>,{" "}
            <span className="putusanStatus putusanStatus--netral">
              belum terverifikasi di cekusaha.id
            </span>
          </h1>
          <p className="putusanKeterangan">
            Kami belum punya catatan verifikasi untuk domain ini. Itu bukan
            tanda ada yang salah. Sebagian besar domain memang belum
            mendaftar.
          </p>
        </header>

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

  const putusan =
    d.tingkat === "identitas"
      ? "identitas pemilik terverifikasi"
      : d.tingkat === "kontak"
        ? "kontak pemilik terverifikasi"
        : "kepemilikan domain terbukti";

  return (
    <article className="halamanB">
      <header className="kepalaB">
        <p className="eyebrow">Halaman verifikasi</p>
        <h1 className="putusanGabung">
          <span className="putusanDomain">{d.domain}</span>,{" "}
          <span className="putusanStatus putusanStatus--terbukti">
            {putusan}
          </span>
        </h1>
      </header>

      {/* ---------- Tiga pilar ----------
          Baris yang dipisah garis tipis. Tiap pilar langsung menyatakan
          faktanya sebagai kalimat; penjelasannya menyusul di bawah,
          lebih kecil, untuk yang bertanya "apa maksudnya ini". */}
      <div className="pilar">
        {/* Pilar 1 */}
        <section className="pilarBaris">
          <h2 className="pilarLabel">Kepemilikan domain</h2>
          <p className="pernyataan">
            Terbukti
            {d.domainTerbuktiPada ? ` pada ${tanggal(d.domainTerbuktiPada)}` : ""}.
          </p>
          <p className="pilarCatatan">
            Pemilik memasang catatan DNS yang kami minta di domain ini. Hanya
            orang yang mengendalikan domain yang bisa melakukannya.
          </p>
        </section>

        {/* Pilar 2 */}
        <section className="pilarBaris">
          <h2 className="pilarLabel">Identitas pemilik</h2>

          {d.tingkat === "identitas" && (
            <>
              <p className="pernyataan">
                {rapikanNama(d.nama)}
                {d.verificator
                  ? `, diperiksa oleh ${rapikanVerificator(d.verificator)}.`
                  : "."}
              </p>
              <p className="pilarCatatan">
                Identitas perorangan diverifikasi hingga tingkat Penyelenggara
                Sertifikasi Elektronik, lewat kredensial e.id milik pemilik.
              </p>
            </>
          )}

          {d.tingkat === "kontak" && (
            <>
              <p className="pernyataan">
                Email dan nomor telepon terverifikasi.
              </p>
              <p className="pilarCatatan">
                Identitas perorangan pemilik belum diverifikasi. Yang terbukti
                baru kontaknya.
              </p>
            </>
          )}

          {d.tingkat === null && (
            <p className="pernyataan pernyataan--belum">
              Pemilik belum menautkan identitas terverifikasi.
            </p>
          )}

        </section>

        {/* Pilar 3. DV dan OV diberi bobot yang sama. Ketiadaan nama
            organisasi bukan sinyal negatif. Penerbit sebagai teks, tanpa logo. */}
        <section className="pilarBaris">
          <h2 className="pilarLabel">Sertifikat situs</h2>

          {d.ssl.ada ? (
            <>
              <p className="pernyataan">
                {d.ssl.organisasi
                  ? `Memuat nama organisasi ${d.ssl.organisasi}`
                  : "Kendali atas domain tervalidasi"}
                {d.ssl.penerbit ? `, diterbitkan ${d.ssl.penerbit}.` : "."}
              </p>
              <p className="pilarCatatan">
                {d.ssl.organisasi
                  ? "Penerbit sertifikat memeriksa keberadaan organisasi ini sebelum menerbitkannya."
                  : "Jenis sertifikat yang paling umum dipakai situs yang sah."}
              </p>
            </>
          ) : (
            <p className="pernyataan pernyataan--belum">
              Sertifikat situs belum diperiksa.
            </p>
          )}
        </section>
      </div>

      {/* ---------- Kontak usaha ----------
          Bukan klaim verifikasi seperti tiga pilar di atas, melainkan
          PEKERJAAN untuk pembeli: bandingkan dengan yang tertera di toko.
          Karena perannya berbeda, bobot visualnya juga dibedakan. */}
      {(d.email || d.telepon) && (
        <section className="kontakUsaha">
          <h2 className="kontakLabel">Kontak usaha yang terverifikasi</h2>
          <dl className="kontakBaris">
            {d.email && (
              <div>
                <dt>Email</dt>
                <dd>
                  <a href={`mailto:${d.email}`} className="kontakNilai">
                    {d.email}
                  </a>
                </dd>
              </div>
            )}
            {d.telepon && (
              <div>
                <dt>Telepon</dt>
                <dd>
                  <a
                    href={`tel:${d.telepon.replace(/[^\d+]/g, "")}`}
                    className="kontakNilai"
                  >
                    {rapikanTelepon(d.telepon)}
                  </a>
                </dd>
              </div>
            )}
          </dl>
          <p className="kontakAjakan">
            Cocokkan dengan kontak yang tertera di toko. Kalau berbeda,
            berhati-hatilah.
          </p>
        </section>
      )}

      {/* ---------- Bagian bawah ----------
          Tiga blok berdampingan supaya lebar yang tersedia terpakai,
          bukan menumpuk ke bawah sambil menyisakan ruang kosong di kanan. */}
      <footer className="kakiB">
        <section>
          <h2>Catatan pendaftaran domain</h2>
          {d.rdap.ada && (d.rdap.tanggalRegistrasi || d.rdap.registrar) ? (
            <p>
              {d.rdap.tanggalRegistrasi
                ? `Terdaftar sejak ${tanggal(d.rdap.tanggalRegistrasi)}`
                : "Terdaftar"}
              {d.rdap.registrar ? ` melalui ${d.rdap.registrar}` : ""}.
              Registrar adalah penyedia jasa pendaftaran domain, bukan
              pemilik domain.
            </p>
          ) : (
            <p>Catatan registri belum tersimpan untuk domain ini.</p>
          )}
        </section>

        <section>
          <h2>Asal data</h2>
          <p>
            Setiap pernyataan di halaman ini berasal dari pemeriksaan yang
            bisa ditunjuk sumbernya: catatan DNS untuk kepemilikan domain,
            kredensial e.id untuk identitas, dan sertifikat situs untuk
            enkripsi. Kami tidak menampilkan apa pun yang tidak kami periksa
            sendiri.
          </p>
        </section>

        <section>
          <h2>Pemeriksaan dan pelaporan</h2>
          <p>
            Seluruh data berasal dari salinan tersimpan.
            {d.diperiksaTerakhir
              ? ` Pemeriksaan terakhir ${tanggalJam(d.diperiksaTerakhir)}.`
              : ""}
          </p>
          <p>
            Menemukan penyalahgunaan halaman ini?{" "}
            <a href={`mailto:${KONTAK_LAPORAN}`}>Laporkan kepada kami</a>.
          </p>
        </section>
      </footer>
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
