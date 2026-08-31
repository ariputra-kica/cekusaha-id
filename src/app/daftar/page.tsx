import { bacaKeadaan } from "@/lib/dcv";
import { bacaSemuaIdentitas, bacaSesiAktif, SKEMA, type Tingkat } from "@/lib/eid";
import { aksiMulai, aksiCekUlang, aksiMulaiEid, aksiPeriksaEid, aksiTerbitkan } from "./actions";
import TombolKirim from "./TombolKirim";
import TombolSalin from "../hasil/TombolSalin";
import QRCode from "qrcode-svg";
import { rapikanNama, rapikanTelepon, rapikanVerificator } from "@/lib/tampilan";

const PESAN_EID: Record<string, string> = {
  "menunggu-pindai":
    "Belum terbaca. Buka tautan di atas lewat ponsel Anda, lalu tekan periksa lagi.",
  "menunggu-persetujuan":
    "Dompet Anda sudah membaca permintaan ini. Sekarang tekan setuju di ponsel, lalu periksa lagi.",
  tersimpan: "Data dari wallet e.id Anda sudah kami terima.",
  ditolak: "Anda menolak berbagi data. Mulai lagi kalau berubah pikiran.",
  kedaluwarsa: "Sesi ini sudah kedaluwarsa. Mulai lagi dari awal.",
  hilang:
    "Persetujuan Anda diterima, tapi datanya kedaluwarsa sebelum sempat kami ambil. Batasnya lima menit. Mohon ulangi.",
  "orang-berbeda":
    "Identitas ini berasal dari dompet e.id yang berbeda dengan yang sudah terdaftar untuk domain ini. Gunakan dompet yang sama.",
  "gagal-mulai": "Tidak bisa memulai sesi verifikasi. Coba sebentar lagi.",
  "belum-siap":
    "Belum bisa disimpan. Kepemilikan domain dan Kontak Terverifikasi harus selesai lebih dulu.",
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

/** Jam lengkap dengan detik, supaya tiap klik terlihat menghasilkan sesuatu. */
function jamLengkap(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * QR sebagai data URI. Isinya alamat dompet yang dikembalikan e.id, sama
 * persis dengan yang dituju tautan di sebelahnya.
 *
 * Dua jalan masuk yang melayani keadaan berbeda: QR untuk pemilik yang
 * membuka halaman ini di komputer sementara dompetnya di ponsel, tautan
 * untuk pemilik yang memang sedang di ponsel dan tidak bisa memindai
 * layarnya sendiri.
 */
function qrDompet(alamat: string) {
  const svg = new QRCode({
    content: alamat,
    padding: 1,
    width: 320,
    height: 320,
    // Hitam di atas putih, kontras penuh, paling andal dipindai.
    color: "#000000",
    background: "#ffffff",
    ecl: "M",
    // Tanpa ini tiap modul jadi satu <rect> sendiri dan berkasnya
    // membengkak jadi ratusan kilobyte.
    join: true,
  }).svg();
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
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
        Aplikasi e.id akan menampilkan data apa saja yang kami minta:{" "}
        {SKEMA[sesi.tingkat].mintaManusia}.
      </p>

      {/* Dua tahap, bukan tiga pilihan. Di atas: dua cara memulai yang
          setara, tinggal pilih sesuai di perangkat mana dompetnya ada.
          Di bawah, dipisah jarak: memeriksa hasilnya, yang baru masuk akal
          SESUDAH pemilik menyetujui di ponselnya. */}
      <div className="dompetMulai">
        {sesi.walletUrl && (
          <figure className="qrDompet">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDompet(sesi.walletUrl)}
              alt="QR menuju permintaan verifikasi e.id"
              width={128}
              height={128}
            />
            <figcaption>Pindai dengan aplikasi e.id</figcaption>
          </figure>
        )}

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
        </p>
      </div>

      <div className="dompetPeriksa">
        <p className="langkahIsi">
          Setelah menyetujui di aplikasi, tekan tombol di bawah.
        </p>
        <form action={aksiPeriksaEid} className="formBaris">
          <input type="hidden" name="domain" value={domain} />
          <input type="hidden" name="sessionId" value={sesi.sessionId} />
          <TombolKirim label="Periksa status" labelSedang="Memeriksa…" />
        </form>
      </div>
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
        <p className="eyebrow">Untuk pemilik usaha</p>
        <h1 className="daftarJudul">Verifikasi Kepemilikan Domain</h1>

        <form action={aksiMulai} className="formBaris formBesar">
          <label className="labelTersembunyi" htmlFor="domain">
            Alamat domain
          </label>
          <input
            id="domain"
            name="domain"
            type="text"
            placeholder="namatoko.id"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            required
          />
          <TombolKirim label="Mulai Verifikasi" labelSedang="Menyiapkan…" />
        </form>

        {sp.galat === "domain-tidak-sah" && (
          <p className="galat">
            Alamat domain itu belum benar. Contoh yang benar:{" "}
            <strong>namatoko.id</strong>
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

    /* Kabar terakhir dan kotak simpan. Letaknya ikut keadaan: selama
       identitas belum terbukti, keduanya berdiri DI ATAS ajakan naik tingkat,
       karena menyimpan adalah langkah utama dan naik tingkat hanya tawaran.
       Begitu identitas terbukti, tidak ada lagi tawaran yang tersisa, jadi
       keduanya turun ke paling bawah sebagai penutup alur. */
    const blokAkhir = (
      <>
        {kabar && <p className={kabarBuruk ? "galat" : "kabar"}>{kabar}</p>}

        {kontak && (
          <section className="simpanBlok">
            <h2>Siap disimpan</h2>
            <p>
              {diri
                ? "Kepemilikan domain dan identitas Anda sudah terverifikasi."
                : "Kepemilikan domain dan kontak Anda sudah terverifikasi. Simpan dan Lihat hasilnya sekarang atau lengkapi verifikasi identitas di bawah."}
            </p>
            <form action={aksiTerbitkan} className="formBaris">
              <input type="hidden" name="domain" value={keadaan.domain} />
              <TombolKirim
                label="Simpan dan lihat hasil"
                labelSedang="Menyimpan…"
              />
            </form>
          </section>
        )}
      </>
    );

    return (
      <>
        <p className="eyebrow">Untuk pemilik usaha</p>
        <h1 className="domainJudul">{keadaan.domain}</h1>

        {/* ---- Langkah 1: kepemilikan domain ---- */}
        <section className="langkah">
          <div className="langkahKepala">
            <h2>Kepemilikan domain</h2>
            <span className="status status--verified">Terbukti</span>
          </div>
          <p className="langkahIsi">
            Dibuktikan lewat DNS pada {waktuLokal(keadaan.terbuktiPada)}.
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
                <dd>{rapikanTelepon(kontak.phoneNumber)}</dd>
              </div>
            </dl>
          ) : sesiKontak ? (
            <SesiBerjalan domain={keadaan.domain} sesi={sesiKontak} />
          ) : (
            <>
              <p className="langkahIsi">
                Verifikasi email dan nomor telepon Anda melalui EID Membership
                di wallet e.id.
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

        {!diri && blokAkhir}

        {/* ---- Langkah 3: identitas, hanya setelah kontak ---- */}
        <section className="langkah langkah--akhir">
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
                <dd>{rapikanNama(diri.fullname)}</dd>
              </div>
              <div>
                <dt>Diverifikasi oleh</dt>
                <dd>{rapikanVerificator(diri.verificator)}</dd>
              </div>
            </dl>
          ) : !kontak ? (
            <p className="langkahIsi">
              Selesaikan verifikasi kontak lebih dulu.
            </p>
          ) : sesiDiri ? (
            <SesiBerjalan domain={keadaan.domain} sesi={sesiDiri} />
          ) : (
            <>
              <p className="langkahIsi">
                Naikkan tingkatnya dengan membuktikan identitas Anda lewat KYC
                Verification by PSrE.
              </p>
              <form action={aksiMulaiEid} className="formBaris">
                <input type="hidden" name="domain" value={keadaan.domain} />
                <input type="hidden" name="tingkat" value="identitas" />
                <TombolKirim
                  label="Naikkan ke Identitas Terverifikasi"
                  labelSedang="Menyiapkan…"
                  gaya="garis"
                />
              </form>
            </>
          )}
        </section>

        {diri && blokAkhir}
      </>
    );
  }

  /* ---------- Menunggu ---------- */
  return (
    <>
      <p className="eyebrow">Untuk pemilik usaha</p>
      <h1 className="domainJudul">{keadaan.domain}</h1>

      <p className="statusBaris">
        <span className="status status--pending">Menunggu pemasangan</span>
      </p>

      <p className="dcvTeks">
        Tambahkan TXT record berikut di pengaturan DNS domain Anda. Jika
        mengalami kesulitan, hubungi penyedia domain Anda.
      </p>

      <dl className="recordDcv">
        <div>
          <dt>Jenis</dt>
          <dd>TXT</dd>
        </div>
        <div>
          <dt>Nama / Host</dt>
          <dd>
            <code>{keadaan.domain}</code> atau <code>@</code>
          </dd>
        </div>
        <div>
          <dt>Nilai</dt>
          <dd className="nilaiBaris">
            <code className="nilaiTxt">{keadaan.nilaiTxt}</code>
            <TombolSalin teks={keadaan.nilaiTxt ?? ""} />
          </dd>
        </div>
      </dl>

      <p className="dcvTeks">
        Setelah disimpan, tekan tombol di bawah. Perubahan DNS kadang
        memerlukan waktu lebih lama. Jika belum terbaca, tunggu beberapa menit
        lalu coba lagi.
      </p>

      <form action={aksiCekUlang} className="formBaris">
        <input type="hidden" name="domain" value={keadaan.domain} />
        <TombolKirim label="Cek Sekarang" labelSedang="Sedang memeriksa DNS…" />
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
    </>
  );
}
