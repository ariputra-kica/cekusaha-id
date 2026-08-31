import { bacaKeadaan } from "@/lib/dcv";
import { bacaSemuaIdentitas, bacaSesiAktif, SKEMA, type Tingkat } from "@/lib/eid";
import { aksiMulai, aksiCekUlang, aksiMulaiEid, aksiPeriksaEid } from "./actions";
import TombolKirim from "./TombolKirim";

const PESAN_EID: Record<string, string> = {
  "menunggu-pindai":
    "Belum terbaca. Buka tautan di atas lewat ponsel Anda, lalu tekan periksa lagi.",
  "menunggu-persetujuan":
    "Dompet Anda sudah membaca permintaan ini. Sekarang tekan setuju di ponsel, lalu periksa lagi.",
  tersimpan: "Berhasil disimpan.",
  ditolak: "Anda menolak berbagi data. Mulai lagi kalau berubah pikiran.",
  kedaluwarsa: "Sesi ini sudah kedaluwarsa. Mulai lagi dari awal.",
  hilang:
    "Persetujuan Anda diterima, tapi datanya kedaluwarsa sebelum sempat kami ambil — batasnya lima menit. Mohon ulangi.",
  "orang-berbeda":
    "Identitas ini berasal dari dompet e.id yang berbeda dengan yang sudah terdaftar untuk domain ini. Gunakan dompet yang sama.",
  "gagal-mulai": "Tidak bisa memulai sesi verifikasi. Coba sebentar lagi.",
  galat: "Terjadi kendala saat menghubungi e.id. Coba sebentar lagi.",
};

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

/** Tampilan saat satu sesi presentasi e.id sedang menunggu pemilik. */
function SesiBerjalan({
  domain,
  sesi,
}: {
  domain: string;
  sesi: { sessionId: string; walletUrl: string | null; tingkat: Tingkat };
}) {
  return (
    <>
      <p className="langkahIsi">
        Buka tautan ini di ponsel Anda. Aplikasi e.id akan menampilkan data apa
        saja yang kami minta — {SKEMA[sesi.tingkat].mintaManusia} — lalu Anda yang
        memutuskan menyetujui atau menolak.
      </p>

      {/* Tab baru: kalau tautan ini menimpa halaman, pemilik kehilangan
          tempat menekan "Periksa status" setelah menyetujui di e.id. */}
      <p className="tautanDompet">
        <a
          href={sesi.walletUrl ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
        >
          Buka di aplikasi e.id
        </a>
        <span className="petunjukTautan">terbuka di tab baru</span>
      </p>

      <form action={aksiPeriksaEid} className="formBaris">
        <input type="hidden" name="domain" value={domain} />
        <input type="hidden" name="sessionId" value={sesi.sessionId} />
        <TombolKirim label="Periksa status" labelSedang="Memeriksa…" />
      </form>
    </>
  );
}

export default async function Pendaftaran({
  searchParams,
}: {
  searchParams: Promise<{ domain?: string; kode?: string; galat?: string; eid?: string }>;
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
          <TombolKirim label="Terbitkan kode" labelSedang="Menerbitkan…" />
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

  /* ---------- Kepemilikan terbukti: lanjut ke identitas e.id ---------- */
  if (keadaan.status === "terbukti") {
    const identitas = bacaSemuaIdentitas(keadaan.domain);
    const kontak = identitas.find((i) => i.tingkat === "kontak") ?? null;
    const diri = identitas.find((i) => i.tingkat === "identitas") ?? null;
    const sesiKontak = kontak ? null : bacaSesiAktif(keadaan.domain, "kontak");
    const sesiDiri = diri ? null : bacaSesiAktif(keadaan.domain, "identitas");

    const kabar = sp.eid ? PESAN_EID[sp.eid] : null;
    const kabarBuruk = ["ditolak", "hilang", "orang-berbeda", "galat", "gagal-mulai"].includes(
      sp.eid || "",
    );

    return (
      <>
        <p className="eyebrow">Untuk pemilik usaha</p>
        <h1>{keadaan.domain}</h1>

        {/* ---- Langkah 1: kepemilikan domain ---- */}
        <section className="langkah">
          <div className="langkahKepala">
            <h2>Kepemilikan domain</h2>
            <span className="status status--verified">Terbukti</span>
          </div>
          <p className="langkahIsi">
            Dibuktikan lewat DNS pada {waktuLokal(keadaan.terbuktiPada)}. Kode
            verifikasinya sudah dihapus dari basis data kami.
          </p>
        </section>

        {/* ---- Langkah 2: kontak ---- */}
        <section className="langkah">
          <div className="langkahKepala">
            <h2>Kontak Terverifikasi</h2>
            {kontak ? (
              <span className="status status--verified">Terbukti</span>
            ) : (
              <span className="status status--pending">Belum</span>
            )}
          </div>

          {kontak ? (
            <dl className="dataIdentitas">
              <div>
                <dt>Email</dt>
                <dd>{kontak.email}</dd>
              </div>
              <div>
                <dt>Telepon</dt>
                <dd>{kontak.phoneNumber}</dd>
              </div>
            </dl>
          ) : sesiKontak ? (
            <SesiBerjalan domain={keadaan.domain} sesi={sesiKontak} />
          ) : (
            <>
              <p className="langkahIsi">
                Buktikan email dan nomor telepon Anda lewat dompet e.id. Yang
                kami minta hanya dua hal itu.
              </p>
              <form action={aksiMulaiEid} className="formBaris">
                <input type="hidden" name="domain" value={keadaan.domain} />
                <input type="hidden" name="tingkat" value="kontak" />
                <TombolKirim
                  label="Mulai verifikasi kontak"
                  labelSedang="Menyiapkan…"
                />
              </form>
            </>
          )}
        </section>

        {/* ---- Langkah 3: identitas, hanya setelah kontak ---- */}
        <section className="langkah">
          <div className="langkahKepala">
            <h2>Identitas Terverifikasi</h2>
            {diri ? (
              <span className="status status--verified">Terbukti</span>
            ) : (
              <span className="status status--pending">
                {kontak ? "Belum" : "Terkunci"}
              </span>
            )}
          </div>

          {diri ? (
            <dl className="dataIdentitas">
              <div>
                <dt>Nama</dt>
                <dd>{diri.fullname}</dd>
              </div>
              <div>
                <dt>Diverifikasi oleh</dt>
                <dd>{diri.verificator}</dd>
              </div>
            </dl>
          ) : !kontak ? (
            <p className="langkahIsi">
              Selesaikan verifikasi kontak lebih dulu. Kepercayaan dibangun
              bertahap — Anda tidak harus menyerahkan semuanya sekaligus.
            </p>
          ) : sesiDiri ? (
            <SesiBerjalan domain={keadaan.domain} sesi={sesiDiri} />
          ) : (
            <>
              <p className="langkahIsi">
                Naikkan tingkatnya dengan membuktikan identitas Anda lewat
                lembaga sertifikasi elektronik. Kami hanya meminta{" "}
                <strong>nama</strong> dan <strong>nama lembaga pemeriksanya</strong> —
                NIK dan tanggal lahir tidak diminta dan tidak pernah sampai ke
                kami.
              </p>
              <form action={aksiMulaiEid} className="formBaris">
                <input type="hidden" name="domain" value={keadaan.domain} />
                <input type="hidden" name="tingkat" value="identitas" />
                <TombolKirim
                  label="Naikkan ke Identitas Terverifikasi"
                  labelSedang="Menyiapkan…"
                />
              </form>
            </>
          )}
        </section>

        {kabar && <p className={kabarBuruk ? "galat" : "kabar"}>{kabar}</p>}

        <p className="note">
          Penerbitan halaman publik belum dipasang.{" "}
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
        <TombolKirim
          label="Cek ulang sekarang"
          labelSedang="Sedang memeriksa DNS…"
        />
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
