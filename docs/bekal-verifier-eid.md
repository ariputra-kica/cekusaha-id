# Bekal Hari-H — Verifier API e.id

> Ringkasan dokumentasi Verifier API e.id dalam bahasa awam, plus daftar tegas hal
> yang tidak ada di dokumentasi dan baru terjawab setelah kredensial di tangan.

| | |
|---|---|
| **Sumber** | `https://docs.e.id` — 137 halaman |
| **Dibaca** | 28 Agustus 2026 |
| **Endpoint dipanggil** | Tidak ada |
| **Versi web** | https://claude.ai/code/artifact/4692a0a0-1d60-4890-9eca-beceb55d9886 |

---

## Jawaban singkat

| # | Pertanyaan | Jawaban |
|---|---|---|
| 1 | Bagaimana aplikasi tahu skema mana yang dipresentasikan? | Aplikasi **tidak menebak** — Anda yang mengunci skemanya di depan lewat template verifikasi. Identitas skema dikembalikan lagi di data sesi sebagai konfirmasi. |
| 2 | Field apa yang kembali saat verifikasi berhasil? | DID pengguna, isi field yang Anda minta, DID penerbit, tanggal terbit, penanda pencabutan. Nama skema seperti "EID Membership Lv1" atau "KYC Verification by PSrE" **tidak ada di dokumentasi**. |
| 3 | Apakah respons memuat tier akun pengguna? | **Tidak** — bukan di Verifier API. Tier hanya muncul di produk lain, yaitu OAuth SSO. |
| 4 | Aplikasi menampilkan QR, atau wallet? | **Dua-duanya bisa.** Alur utamanya: aplikasi Anda menampilkan QR, dompet memindai, lalu pengguna menyetujui di HP-nya. |
| 5 | Butuh callback/webhook, atau cukup polling? | **Polling cukup.** Webhook opsional. Untuk acara sehari, polling justru lebih praktis. |

---

## Konsep dasar: tiga lapis yang harus dibedakan

Hampir semua kebingungan soal API ini hilang begitu tiga istilah berikut terpisah
rapi di kepala.

### 1. Document Schema — milik penerbit, hanya baca

"Kartu" yang diterbitkan sebuah organisasi. Berisi nama skema, kategori, dan daftar
field beserta tipe dan status wajibnya. Anda hanya bisa melihat, tidak mengubah.

### 2. Verification Schema — milik Anda, dibuat sekali

Template permintaan Anda: "saya minta kartu X, dan field A, B, C dari kartu itu".
Sekali dibuat, dipakai berulang untuk semua peserta.

### 3. Presentation (VP) — satu peserta, satu kali

Satu interaksi verifikasi nyata dengan satu orang — dari QR muncul di layar sampai
datanya terbaca. Punya masa hidup sendiri yang pendek.

### Alamat server

- Uji coba: `https://gateway-sandbox.e.id`
- Produksi: `https://gateway.e.id`

Panitia harus memberi tahu kredensial Anda untuk yang mana.

---

## 1. Bagaimana aplikasi tahu skema mana yang sedang dipresentasikan?

Kuncinya: **aplikasi verifier tidak menerima apa saja lalu menebak isinya.** Anda
menentukan lebih dulu, dan sesi verifikasi terkunci ke pilihan itu.

Saat membuat template verifikasi, Anda mengisi `expected_schemas` — daftar
`schema_id` milik penerbit, masing-masing dengan `required_fields`-nya. Lalu saat
memulai sesi dengan seorang peserta, Anda hanya mengirim `verifier_doc_schema_id`,
yaitu ID template tadi. Dompet peserta hanya bisa menjawab dengan kartu yang cocok.

### Konfirmasi balik dari sistem

Setiap respons sesi mengembalikan identitas skemanya kepada Anda, di dalam blok
`verification_schema.document_schema`:

| Field | Isinya |
|---|---|
| `document_schema_id` | ID skema kartu yang diminta |
| `schema_title` | Judul skema, mis. `membership-card-v1` |
| `document_uid` | Pengenal dokumen dari penerbit |
| `category` | Kategori, mis. `identity` |
| `issuer_account` | Siapa penerbitnya — username dan DID |

Blok yang sama juga ikut di payload webhook. Jadi identitas skema datang dari
**data sesi**, bukan dari isi kartunya sendiri.

> **Detail yang mudah terlewat.** Di contoh hasil verifikasi, field `type` pada
> kartunya hanya berisi `["VerifiableCredential"]` — generik, tanpa nama skema.
> Jangan mengandalkan isi kartu untuk mengenali skema; andalkan data sesinya.

Pada alur terbalik — ketika Anda yang memindai QR milik peserta — Anda tetap wajib
mengirim `verifier_doc_schema_id` pilihan Anda sebagai pembanding. Prinsipnya sama.

---

## 2. Field apa yang dikembalikan saat verifikasi berhasil?

Dari endpoint VP Result:

| Field | Isinya |
|---|---|
| `holder_did` | Identitas digital pengguna, mis. `did:eid:…` |
| `credentialSubject` | **Data aslinya** — persis field yang Anda minta lewat `required_fields`. Contoh di dokumentasi: `email`, `subject_id` |
| `issuer` | DID organisasi penerbit kartu |
| `issuanceDate` | Tanggal kartu diterbitkan |
| `credentialStatus` | Penanda pencabutan on-chain, bertipe `EidChainRevocation2024` |
| `id` | ID unik kartu, format `urn:uuid:…` |
| `session_id` | ID sesi, untuk dicocokkan dengan sesi yang Anda buat |
| `status` | `APPROVED` |
| `retrieved_at` | Waktu data diambil |

### Soal "EID Membership Lv1" dan "KYC Verification by PSrE"

> **Tidak ada di dokumentasi.** Saya mencari kedua nama itu di seluruh 137 halaman
> dokumentasi. **Nol hasil.** Semua contoh memakai placeholder generik:
> `membership-card`, `membership-card-v1`, `example-document-uid`, kategori
> `identity`.
>
> Kata "PSrE" hanya muncul **satu kali** di seluruh situs — di halaman KYC Gateway
> soal "masa berlaku PSRE 2 tahun" saat mengecek NIK. Sama sekali tidak berkaitan
> dengan penamaan skema verifier.

Nama-nama skema yang sebenarnya baru terlihat setelah Anda punya token, lewat
endpoint daftar skema. Itu panggilan kedua yang harus Anda lakukan hari-H.

---

## 3. Apakah respons memuat tier akun pengguna?

**Tidak.** Tidak ada field `tier`, `level`, atau sejenisnya — baik di hasil
verifikasi, detail sesi, maupun payload webhook. Tidak di mana pun dalam Verifier
API.

Kata "tier" hanya muncul di produk yang **berbeda**: OAuth SSO. Di sana endpoint
profil mengembalikan `profile.tier: 2`, dan dokumentasinya mendefinisikan:

| Tier | Nama | Syarat |
|---|---|---|
| 0 | Unverified | Belum terverifikasi — tidak bisa mengakses fitur apa pun |
| 1 | Basic | Email dan nomor HP terverifikasi |
| 2 | Moderate | Email, nomor HP, dan identitas resmi terverifikasi |

"Tier Terverifikasi 2" di dompet Anda cocok dengan Tier 2 ini. Tapi jalurnya
berbeda total: OAuth SSO memakai alamat server sendiri dan alur login browser
dengan redirect, bukan alur presentasi kartu.

> **Konsekuensinya.** Kalau tier itu yang Anda butuhkan untuk menyaring peserta,
> Anda perlu OAuth SSO — bukan Verifier API. Dokumentasi tidak menjelaskan apakah
> keduanya bisa digabung dalam satu alur, atau apakah satu set kredensial berlaku
> untuk keduanya.

---

## 4. Alur QR-nya seperti apa?

**Dua arah didukung.** Yang utama dan paling cocok untuk meja registrasi adalah
arah pertama.

### Arah utama — layar Anda menampilkan QR

1. **Anda membuat permintaan.** Sistem mengembalikan sebuah URL dompet plus
   `challenge` dan `qr_token`. Tampilkan sebagai QR di layar.
2. **Peserta memindai dengan aplikasi e.id.** Status sesi berubah jadi
   `WAITING_APPROVAL`.
3. **Peserta menyetujui atau menolak di HP-nya.** Status jadi `APPROVED` atau
   `REJECTED`. Kalau menolak, ada `reject_reason`.
4. **Anda mengambil datanya.** Panggil VP Result dengan ID sesi tadi.

> **Yang perlu diantisipasi di lapangan.** Persetujuan terjadi **di tangan peserta,
> di HP-nya** — bukan otomatis saat dipindai. Jadi antrean bisa tertahan di langkah
> 3 kalau peserta ragu atau layarnya keburu mati. Siapkan instruksi lisan yang
> singkat.

### Arah terbalik — peserta menampilkan QR, Anda memindai

Peserta membuat sesi sendiri dari dompetnya, dan bisa me-*refresh* QR-nya kalau
kedaluwarsa sebelum sempat dipindai. Anda lalu mengirim `qr_token`, `challenge`,
dan `verifier_doc_schema_id` Anda. Bedanya: respons **langsung berisi data
kartunya**, dengan status `SCANNED` — tanpa menunggu langkah persetujuan terpisah.

---

## 5. Butuh callback/webhook, atau cukup polling?

> **Jawaban singkat.** Polling cukup. Dokumentasi sendiri menyebut webhook sebagai
> cara "bereaksi real-time *alih-alih* polling", dan di bagian Quick Answers justru
> menyarankan polling untuk menunggu jawaban peserta.

**Polling** memakai endpoint sesi versi ringan, yang mengembalikan `status`,
`presentation_ttl`, dan `expires_at`. Cukup panggil berulang sampai statusnya
berubah.

**Webhook** disetel lewat `default_webhook_url` di profil Anda, atau
`custom_webhook_url` per template. Bentuk payload-nya sama untuk semua kejadian —
yang membedakan hanya field `status`:

| Status | Kapan dikirim | `presentation_ttl` |
|---|---|---|
| `WAITING_APPROVAL` | Peserta memindai QR | 0 |
| `REJECTED` | Peserta menolak berbagi data | 0 |
| `APPROVED` | Peserta menyetujui | ≥ 300 detik |

> **Ini yang paling mudah bikin gagal di hari-H.** Data hasil hanya bisa diambil
> selama `presentation_ttl` masih hidup — contoh di dokumentasi **300 detik alias 5
> menit**. Lewat itu, permintaan data dijawab *"Presentation data not found or
> expired"*.
>
> Jadi: begitu status jadi `APPROVED`, ambil datanya **segera** dan simpan sendiri.
> Jangan menunda sampai akhir acara.

Untuk acara satu hari, polling jelas lebih ringan: tidak perlu URL publik yang bisa
dijangkau dari internet, tidak perlu memikirkan apa yang terjadi kalau webhook
gagal terkirim.

---

## Yang TIDAK terjawab di dokumentasi

Enam belas hal berikut **benar-benar tidak ditulis** di dokumentasi — bukan belum
saya temukan. Semuanya baru terjawab setelah kredensial di tangan, atau harus
ditanyakan langsung ke panitia.

### Skema dan data

1. **Nama dan ID skema yang sebenarnya.** Tidak ada daftar skema nyata di
   dokumentasi. Harus dilihat lewat endpoint daftar skema dengan token Anda.
2. **Nama field persis di dalam data kartu.** Contoh dokumentasi hanya `fullname`,
   `email`, `subject_id`, `phone_number` — semuanya placeholder.
3. **Apakah skema yang Anda butuhkan terbuka atau tertutup.** Ada field `is_public`
   dan `private_code`, tapi tidak dijelaskan apa yang terjadi kalau skemanya
   tertutup — apakah Anda tetap bisa memakainya, atau perlu izin dari penerbit.
4. **Apakah tier akun bisa diperoleh saat verifikasi sama sekali.** Dokumentasi
   tidak menyatakan ada atau tidaknya hubungan antara tier OAuth SSO dan alur
   presentasi kartu.
5. **Apakah DID pengguna stabil lintas sesi.** Yaitu: bisakah dipakai sebagai
   identitas unik peserta untuk mencegah orang yang sama terdaftar dua kali. Tidak
   dinyatakan.

### Lingkungan dan kredensial

6. **Kredensial Anda untuk sandbox atau produksi.** Alamat servernya berbeda.
   Panitia harus memberi tahu.
7. **Alamat dompet produksi.** Semua contoh dokumentasi memakai alamat dompet
   sandbox; padanan produksinya tidak pernah disebut. Ini berisiko — QR sandbox
   kemungkinan tidak terbaca oleh aplikasi e.id produksi di HP peserta, tapi
   dokumentasi tidak menjelaskan apakah keduanya memang terpisah.
8. **Apakah akun verifier Anda sudah siap dipakai.** Apakah sudah punya izin
   membuat template verifikasi, atau masih perlu disiapkan panitia lebih dulu.

### Teknis operasional

9. **Keamanan webhook.** Tidak ada dokumentasi soal tanda tangan digital, header
   rahasia, daftar IP, kebijakan percobaan ulang, atau timeout. Artinya tidak ada
   cara terdokumentasi untuk memastikan sebuah callback benar-benar datang dari
   e.id. Modul KYC punya endpoint validasi webhook sendiri; padanannya untuk
   verifier tidak ada.
10. **Batas jumlah permintaan per waktu.** Tidak disebut sama sekali, dan tidak ada
    contoh error kelebihan kuota. Penting kalau Anda berencana polling cepat untuk
    banyak peserta sekaligus.
11. **Nilai default, minimum, dan maksimum untuk semua pengaturan waktu.** Masa
    berlaku QR, masa hidup template, dan masa hidup data hasil hanya muncul sebagai
    angka contoh. Rentang yang diizinkan tidak ditulis.
12. **Arti `presentation_limit`** selain "0 = tak terbatas". Dihitung per template
    atau per sesi? Apa yang terjadi begitu kuotanya habis?
13. **Masa berlaku token akses.** Contoh menunjukkan 3600 detik, tapi tidak
    dinyatakan sebagai jaminan.
14. **Daftar status yang tidak konsisten.** Filter daftar sesi menyebut enam status,
    tetapi contoh respons di halaman lain menampilkan status `SCANNED` yang tidak
    ada di daftar itu. Hubungannya dengan `WAITING_APPROVAL` tidak dijelaskan.
15. **Daftar kode error lengkap.** Untuk endpoint presentasi, yang ditampilkan hanya
    "tidak ditemukan" dan "sudah ada".
16. **Apakah URL webhook wajib HTTPS** dan wajib bisa dijangkau publik. Tidak
    dinyatakan.

---

## Begitu kredensial diterima: tiga panggilan pertama

Berurutan, dan poin 1–3 di daftar celah di atas akan terjawab dalam hitungan menit.

1. **Ambil token akses** — tukar ClientID dan Client Secret dari panitia.
2. **Lihat daftar skema** — di sinilah nama dan ID skema yang sebenarnya muncul,
   termasuk apakah "EID Membership Lv1" dan "KYC Verification by PSrE" memang ada
   dan bagaimana persisnya tertulis.
3. **Buka detail skema yang Anda pilih** — untuk melihat nama field persisnya, yang
   akan Anda tulis di `required_fields`.

---

## Catatan sumber

Disusun dari pembacaan langsung `docs.e.id` pada 28 Agustus 2026 — bagian Verifier
API (Overview, Authentication, Login with VC, Profile, Document Schema,
Verification Schema, Presentation, Event Callbacks), plus OAuth SSO dan KYC Gateway
untuk memeriksa soal tier dan PSrE.

Tidak ada endpoint yang dipanggil. Semua contoh nilai di dokumentasi adalah
placeholder, dan disebut demikian oleh dokumentasinya sendiri.
