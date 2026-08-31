import { bacaKeadaan } from "@/lib/dcv";
import { aksiMulai, aksiCekUlang } from "./actions";

const PESAN: Record<string, string> = {
  "belum-ada-txt":
    "Belum ada TXT record yang terbaca di domain ini. Kalau baru saja dipasang, perubahan DNS biasanya butuh beberapa menit sampai satu jam untuk menyebar.",
  "belum-cocok":
    "TXT record ditemukan, tapi belum ada yang cocok dengan token Anda. Periksa apakah nilainya tersalin utuh.",
  "gagal-dns":
    "Kueri DNS tidak berhasil dijalankan. Coba cek ulang sebentar lagi.",
  "sudah-terbukti": "Kepemilikan domain ini memang sudah terbukti sebelumnya.",
  "tidak-terdaftar": "Domain ini belum didaftarkan.",
};

function waktuLokal(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

/** Jam lengkap dengan detik — supaya tiap klik terlihat menghasilkan sesuatu. */
function jamLengkap(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default async function Pendaftaran({
  searchParams,
}: {
  searchParams: Promise<{ domain?: string; kode?: string; galat?: string }>;
}) {
  const sp = await searchParams;
  const keadaan = sp.domain ? bacaKeadaan(sp.domain) : null;

  /* ---------- Belum memilih domain ---------- */
  if (!keadaan) {
    return (
      <>
        <p className="eyebrow">Untuk pemilik usaha — langkah 1 dari 4</p>
        <h1>Buktikan domain ini milik Anda</h1>
        <p className="lead">
          Kami menerbitkan satu kode unik. Anda memasangnya di pengaturan DNS
          domain Anda. Setelah itu kami memeriksanya — dan hanya orang yang
          benar-benar mengendalikan domain yang bisa melakukannya.
        </p>

        <form action={aksiMulai} className="formBaris">
          <label className="labelTersembunyi" htmlFor="domain">
            Alamat domain
          </label>
          <input
            id="domain"
            name="domain"
            type="text"
            placeholder="tokobunga.id"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            required
          />
          <button type="submit" className="tombol">
            Terbitkan kode
          </button>
        </form>

        {sp.galat === "domain-tidak-sah" && (
          <p className="galat">
            Alamat domain itu belum benar. Contoh yang benar:{" "}
            <strong>tokobunga.id</strong>
          </p>
        )}
      </>
    );
  }

  /* ---------- Sudah terbukti ---------- */
  if (keadaan.status === "terbukti") {
    return (
      <>
        <p className="eyebrow">Untuk pemilik usaha — langkah 1 dari 4</p>
        <h1>{keadaan.domain}</h1>

        <p className="statusBaris">
          <span className="status status--verified">Kepemilikan terbukti</span>
        </p>

        <p className="lead">
          Anda sudah membuktikan kendali atas domain ini pada{" "}
          {waktuLokal(keadaan.terbuktiPada)}. Kode verifikasinya sudah dihapus
          dari basis data kami — sudah tidak diperlukan lagi.
        </p>

        <p className="lanjut">
          TXT record itu boleh Anda biarkan atau hapus dari DNS. Keduanya tidak
          mengubah apa pun.
        </p>

        <p className="note">
          Langkah berikutnya — menautkan identitas e.id — belum dipasang.{" "}
          <a href="/daftar">Daftarkan domain lain</a>
        </p>
      </>
    );
  }

  /* ---------- Menunggu ---------- */
  return (
    <>
      <p className="eyebrow">Untuk pemilik usaha — langkah 1 dari 4</p>
      <h1>{keadaan.domain}</h1>

      <p className="statusBaris">
        <span className="status status--pending">Menunggu pemasangan</span>
      </p>

      <p className="lead">
        Tambahkan satu TXT record berikut di pengaturan DNS domain Anda —
        biasanya di panel tempat Anda membeli domain.
      </p>

      <dl className="recordDcv">
        <div>
          <dt>Jenis</dt>
          <dd>TXT</dd>
        </div>
        <div>
          <dt>Nama / Host</dt>
          <dd>
            <code>@</code>{" "}
            <span className="petunjuk">(artinya domain itu sendiri)</span>
          </dd>
        </div>
        <div>
          <dt>Nilai</dt>
          <dd>
            <code className="nilaiTxt">{keadaan.nilaiTxt}</code>
          </dd>
        </div>
      </dl>

      <p className="lanjut">
        Setelah disimpan, tekan tombol di bawah. Perubahan DNS tidak langsung
        menyebar — kalau belum terbaca, tunggu beberapa menit lalu coba lagi.
        Halaman ini tidak akan hilang.
      </p>

      <form action={aksiCekUlang} className="formBaris">
        <input type="hidden" name="domain" value={keadaan.domain} />
        <button type="submit" className="tombol">
          Cek ulang sekarang
        </button>
      </form>

      {keadaan.diperiksaPada && (
        <div className={keadaan.kode === "gagal-dns" ? "galat" : "kabar"}>
          <p className="kabarJudul">
            Diperiksa pukul {jamLengkap(keadaan.diperiksaPada)}
          </p>
          <p className="kabarIsi">
            {(keadaan.kode && PESAN[keadaan.kode]) ||
              "Pemeriksaan dijalankan."}
          </p>

          {keadaan.txtTerbaca && keadaan.txtTerbaca.length > 0 && (
            <>
              <p className="kabarIsi">
                TXT record yang kami baca di domain ini:
              </p>
              <ul className="daftarTxt">
                {keadaan.txtTerbaca.map((baris, i) => (
                  <li key={i}>
                    <code>{baris}</code>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <p className="note">
        Kami bertanya langsung ke server DNS resmi domain Anda, bukan lewat
        perantara — jadi hasilnya selalu yang terbaru.{" "}
        <a href="/daftar">Daftarkan domain lain</a>
      </p>
    </>
  );
}
