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

/**
 * Menutup kalimat dengan titik, kecuali kalau isinya sudah berakhir titik.
 * Nama dari sumber luar sering membawa titiknya sendiri, misalnya
 * "KOREA INFORMATION CERTIFICATE AUTHORITY INC." dan tanpa ini kalimatnya
 * berakhir dengan dua titik.
 */
function titik(teks: string) {
  return /[.!?]$/.test(teks.trim()) ? teks : `${teks}.`;
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
              belum terverifikasi
            </span>
          </h1>
        </header>

        <Penutup domain={d.domain} />
      </article>
    );
  }

  /* Bunyinya mengikuti tingkat tertinggi yang terbukti, bukan teks tetap.
     Hanya tingkat identitas yang boleh berbunyi "terverifikasi" begitu saja.
     Dua tingkat di bawahnya wajib menyebut batasnya, kalau tidak halaman ini
     menjanjikan lebih dari yang sebenarnya dibuktikan. */
  const putusan =
    d.tingkat === "identitas"
      ? "terverifikasi"
      : d.tingkat === "kontak"
        ? "kontak pemilik terverifikasi"
        : "kepemilikan domain terbukti";

  // Tanpa kualifikasi, domain dan putusannya menyatu jadi satu frasa.
  const pakaiKoma = d.tingkat !== "identitas";

  return (
    <article className="halamanB">
      <header className="kepalaB">
        <p className="eyebrow">Halaman verifikasi</p>
        <h1 className="putusanGabung">
          <span className="putusanDomain">{d.domain}</span>
          {pakaiKoma ? "," : ""}{" "}
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
          {/* Dua tanggal yang berbeda dan mudah tertukar: yang di atas adalah
              saat kepemilikan dibuktikan di sini, yang di bawah adalah umur
              domainnya sendiri menurut registri. */}
          <p className="pernyataan">
            Terverifikasi
            {d.domainTerbuktiPada ? ` sejak ${tanggal(d.domainTerbuktiPada)}` : ""}.
          </p>
          {d.rdap.ada && (d.rdap.tanggalRegistrasi || d.rdap.registrar) && (
            <p className="pilarCatatan">
              {titik(
                (d.rdap.tanggalRegistrasi
                  ? `Terdaftar sejak ${tanggal(d.rdap.tanggalRegistrasi)}`
                  : "Terdaftar") +
                  (d.rdap.registrar
                    ? `${d.rdap.tanggalRegistrasi ? "," : ""} melalui registrar PANDI, ${d.rdap.registrar}`
                    : ""),
              )}
            </p>
          )}
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
                Sertifikasi Elektronik, lewat kredensial e.id milik pemilik
                usaha.
              </p>
            </>
          )}

          {d.tingkat === "kontak" && (
            <>
              <p className="pernyataan">
                Email dan nomor telepon terverifikasi.
              </p>
              <p className="pilarCatatan">
                Identitas perorangan pemilik belum diverifikasi.
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
          <h2 className="pilarLabel">Informasi SSL/TLS Certificate</h2>

          {d.ssl.ada ? (
            <>
              {/* Tingkatnya lebih dulu, detailnya menyusul. DV dan OV ditulis
                  sebagai dua bentuk yang setara, bukan sebagai yang lengkap
                  dan yang kurang. Pembedanya ada tidaknya nama organisasi
                  pada subject sertifikat. */}
              <p className="pernyataan">
                {d.ssl.organisasi
                  ? "Verifikasi Tingkat Organisasi"
                  : "Verifikasi Tingkat Domain"}
              </p>
              {d.ssl.penerbit && (
                <p className="pilarCatatan">
                  {titik(
                    `Sertifikat diterbitkan oleh ${d.ssl.penerbit}` +
                      (d.ssl.organisasi ? ` untuk ${d.ssl.organisasi}` : ""),
                  )}
                </p>
              )}
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
            Cocokkan dengan kontak yang diberikan pemilik usaha.
          </p>
        </section>
      )}

      {/* ---------- Bagian bawah ----------
          Tiga blok berdampingan supaya lebar yang tersedia terpakai,
          bukan menumpuk ke bawah sambil menyisakan ruang kosong di kanan. */}
      <footer className="kakiB kakiB--satu">
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

function Penutup({ domain }: { domain: string }) {
  return (
    <footer className="kakiB kakiB--dua">
      <section>
        <h2>Catatan verifikasi</h2>
        <p>Kami belum punya catatan verifikasi untuk domain ini.</p>
        <p>
          Pemilik domain ini?{" "}
          <a href={`/daftar?domain=${encodeURIComponent(domain)}`}>
            Buktikan kepemilikannya
          </a>
        </p>
      </section>

      {/* Domain ini belum terdaftar di sini, jadi tidak ada halaman kami yang
          bisa disalahgunakan. Laporan soal domainnya sendiri ditangani IDADX. */}
      <section>
        <h2>Pelaporan</h2>
        <p>
          Menemukan penyalahgunaan domain ini?{" "}
          <a href="https://idadx.id/report" rel="noopener noreferrer">
            Laporkan kepada IDADX
          </a>
          .
        </p>
      </section>
    </footer>
  );
}
