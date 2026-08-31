import { aksiPeriksaDomain } from "./actions";
import TombolKirim from "./daftar/TombolKirim";

export default async function Beranda({
  searchParams,
}: {
  searchParams: Promise<{ galat?: string }>;
}) {
  const sp = await searchParams;

  return (
    <div className="beranda">
      <h1 className="berandaJudul">Siapa di balik usaha ini?</h1>

      <form action={aksiPeriksaDomain} className="formBaris formBesar">
        <label className="labelTersembunyi" htmlFor="domain">
          Alamat domain yang ingin diperiksa
        </label>
        <input
          id="domain"
          name="domain"
          type="text"
          inputMode="url"
          placeholder="namatoko.id"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          required
        />
        <TombolKirim label="Periksa" labelSedang="Membuka…" />
      </form>

      {sp.galat === "domain-tidak-sah" && (
        <p className="galat">
          Alamat domain itu belum benar. Contoh yang benar:{" "}
          <strong>namatoko.id</strong>
        </p>
      )}

      {/* Sengaja ringan, bukan tombol. Pekerjaan utama halaman ini adalah
          memeriksa; mendaftar hanya jalan samping untuk pemilik usaha. */}
      <p className="ajakanDaftar">
        Pemilik usaha? <a href="/daftar">Daftarkan domain Anda</a>
      </p>

      {/* Tiga hal yang diperiksa, berdampingan sebagai baris yang dipisah
          garis tipis. Bobotnya sama, tidak ada yang lebih penting. */}
      <section className="apaYangDiperiksa">
        <h2>Apa yang diperiksa</h2>
        <ul>
          <li>
            <strong>Kepemilikan domain.</strong> Pemilik melakukan verifikasi
            domain melalui ketentuan yang berlaku. Hanya orang yang memiliki
            akses langsung ke domain yang bisa melakukannya.
          </li>
          <li>
            <strong>Identitas pemilik.</strong> Kontak atau identitas
            perorangan, dibuktikan lewat kredensial e.id miliknya sendiri.
          </li>
          <li>
            <strong>SSL/TLS Certificate.</strong> Jenis validasi, penerbit, dan
            lembaga (jika ada), dibaca langsung dari sertifikat situs tersebut.
          </li>
        </ul>
      </section>
    </div>
  );
}
