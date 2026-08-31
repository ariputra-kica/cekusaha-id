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
      <p className="eyebrow">Periksa sebuah domain</p>
      <h1 className="berandaJudul">Siapa yang berdiri di balik domain ini?</h1>
      <p className="berandaLead">
        Masukkan alamat domain .id untuk melihat apa yang sudah dibuktikan
        pemiliknya — kendali atas domain, identitas terverifikasi, dan
        sertifikat situsnya.
      </p>

      <form action={aksiPeriksaDomain} className="formBaris formCari">
        <label className="labelTersembunyi" htmlFor="domain">
          Alamat domain yang ingin diperiksa
        </label>
        <input
          id="domain"
          name="domain"
          type="text"
          inputMode="url"
          placeholder="tokobunga.id"
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
          <strong>tokobunga.id</strong>
        </p>
      )}

      {/* Inti pertahanan anti-transplantasi: lencana bisa disalin siapa saja
          dan ditempel di situs mana saja. Yang tidak bisa dipalsukan adalah
          hasil pemeriksaan di sini, karena terikat pada nama domainnya. */}
      <section className="peringatanTransplantasi">
        <h2>Selalu periksa dari sini</h2>
        <p>
          Lencana atau tangkapan layar bisa disalin siapa saja dan ditempel di
          situs mana pun. Yang tidak bisa dipindahkan adalah hasil pemeriksaan
          di halaman ini, karena terikat pada nama domain yang Anda ketik
          sendiri.
        </p>
        <p>
          Kalau sebuah situs menampilkan lencana cekusaha.id, ketik alamat
          situs itu di kotak di atas dan bandingkan hasilnya.
        </p>
      </section>

      <section className="apaYangDiperiksa">
        <h2>Apa yang diperiksa</h2>
        <ul>
          <li>
            <strong>Kepemilikan domain</strong> — pemilik memasang catatan DNS
            yang kami minta. Hanya orang yang mengendalikan domain yang bisa
            melakukannya.
          </li>
          <li>
            <strong>Identitas pemilik</strong> — kontak atau identitas
            perorangan, dibuktikan lewat kredensial e.id miliknya sendiri.
          </li>
          <li>
            <strong>Sertifikat situs</strong> — jenis validasi dan penerbitnya,
            dibaca langsung dari sertifikat situs itu.
          </li>
        </ul>
        <p className="apaCatatan">
          Domain yang belum terdaftar di sini bukan berarti bermasalah.
          Sebagian besar domain memang belum mendaftar.
        </p>
      </section>

      <p className="ajakanDaftar">
        Pemilik usaha?{" "}
        <a href="/daftar">Daftarkan domain Anda</a>
      </p>
    </div>
  );
}
