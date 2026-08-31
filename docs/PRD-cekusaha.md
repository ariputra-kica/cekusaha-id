# PRD — cekusaha.id

**Product Requirements Document**
Disusun: 29 Agustus 2026
Peserta: Ari Widya Putra (individu)
Acara: .id Vibe Coding 2026 — PANDI, 31 Agustus – 1 September 2026

> Bagian bertanda 🔲 hanya bisa dilengkapi setelah kredensial e.id diterima pada hari pelaksanaan.

---

## 1. Ringkasan

cekusaha.id memungkinkan pemilik UMKM membuktikan bahwa sebuah domain .id benar miliknya, dan bahwa ada orang terverifikasi di baliknya — lalu menerbitkan bukti itu dalam bentuk yang bisa diperiksa siapa saja dalam hitungan detik.

Satu kalimat: **aplikasi ini memungkinkan pemilik UMKM menautkan identitas e.id-nya ke domain .id miliknya, dan menerbitkan bukti yang dapat diverifikasi publik.**

---

## 2. Masalah

Domain .id ada untuk website. Tetapi mayoritas UMKM Indonesia tidak punya website — mereka berjualan lewat marketplace dan WhatsApp.

Penyebabnya bukan teknologi. Hari ini AI dapat membuatkan website dalam hitungan menit. Yang tidak dapat dibuatkan AI adalah **kepercayaan**.

Di marketplace, kepercayaan itu **disewa** dari platform. Centang biru, rating, dan sistem escrow adalah milik platform, berlaku hanya di dalam platform, dan hilang begitu penjual pindah. Website sendiri tidak punya apa pun yang setara.

### Bukti-bukti itu sebenarnya sudah ada — tapi tidak terlihat

| Bukti | Di mana | Kenapa tidak terlihat pembeli |
|---|---|---|
| Domain terdaftar sah | Registry .id | RDAP meredaksi data registrant (praktik standar pasca-GDPR). Domain .id tingkat teratas juga tidak menuntut syarat identitas |
| Organisasi tervalidasi | Sertifikat SSL (OV/EV) | Browser sudah menghapus indikator EV. Nama organisasi kini harus dicari sampai detail Certificate Information |
| Identitas pemilik terverifikasi | Dompet e.id | Tersimpan privat di dompet pemiliknya, tidak terhubung ke lapaknya |

Ketiganya ada, tersebar di tiga tempat, dan tidak satu pun tampil di depan calon pembeli.

PANDI sendiri sudah mengakui masalah ini secara publik lewat siaran pers November 2025 tentang pentingnya verifikasi domain, yang dipicu kasus situs coretax palsu.

### Kenapa masalah ini pantas dipecahkan sekarang

Kepercayaan adalah penghalang terakhir yang tersisa bagi UMKM untuk berdiri sendiri secara digital. Selama satu-satunya sumber kepercayaan adalah platform, UMKM akan terus menyewa alih-alih memiliki.

---

## 3. Target pengguna

### Pengguna utama

**Pemilik UMKM yang punya atau sedang membangun website di domain .id.** Sudah berjualan lewat media sosial atau marketplace, ingin punya kanal sendiri, tetapi kehilangan sinyal kepercayaan begitu keluar dari platform.

Karakteristik yang membentuk desain: bukan orang teknis, waktu terbatas, dan tidak akan menyelesaikan proses verifikasi panjang di hari pertama.

**Konsekuensi desain:** proses pendaftaran harus selesai dalam satu layar, dan harus ada jalur masuk yang ringan — bukan gerbang yang menuntut verifikasi penuh sekaligus.

### Pengguna kedua

**Calon pembeli.** Menemukan sebuah toko .id yang belum dikenalnya dan ingin memastikan sebelum bertransaksi. Tidak punya akun apa pun, tidak akan memasang aplikasi.

**Konsekuensi desain:** sisi pemeriksaan tidak boleh menuntut akun, aplikasi, atau dompet. Cukup kamera ponsel biasa atau satu tautan.

### Bukan untuk

- Perusahaan besar yang sudah punya kanal kepercayaan sendiri
- Pemilik domain yang menuntut anonimitas
- Kasus penindakan atau pelaporan penipuan — cekusaha.id menampilkan bukti positif, tidak menuduh siapa pun

---

## 4. Fitur utama

Disusun berdasarkan prioritas pembangunan. Lapis yang lebih rendah dibuang lebih dulu bila waktu tidak mencukupi.

### Lapis 1 — Inti

**1.1 Validasi kepemilikan domain**
Aplikasi menerbitkan token, pemilik memasangnya sebagai DNS TXT record, aplikasi memverifikasi lewat satu query DNS. Tanpa langkah ini, siapa pun dapat mendaftarkan domain milik orang lain.

Metode ini sengaja meniru Domain Control Validation yang dipakai Certificate Authority — standar industri, bukan mekanisme karangan.

**1.2 Pemeriksaan data domain (RDAP)**
Memanggil `rdap.pandi.id/rdap/domain/{domain}` untuk menampilkan tanggal registrasi dan kedaluwarsa, status DNSSEC, registrar, dan status premium. Publik, tanpa kredensial.

**1.3 Pembacaan sertifikat SSL**
Membaca sertifikat dari koneksi TLS untuk menampilkan jenis validasi (DV/OV/EV), penerbit, dan nama organisasi bila ada.

Ditampilkan sebagai teks, netral terhadap penerbit, tanpa logo CA mana pun. **Kehadiran organisasi adalah sinyal positif; ketiadaannya bukan sinyal negatif** — mayoritas situs sah memakai DV.

**1.4 Verifikasi identitas lewat e.id**
Lihat bagian 5.

**1.5 Halaman hasil**
Satu halaman berisi seluruh bukti yang berhasil dikumpulkan.

### Lapis 2 — Tiga saluran distribusi

Halaman hasil menyediakan tiga aset siap pakai, semuanya menuju halaman verifikasi publik yang sama:

| Aset | Untuk |
|---|---|
| **QR code** | Dicetak, ditempel di kemasan atau etalase fisik |
| **Tautan pendek s.id** | Bio media sosial |
| **Seal + kode semat** | Dipasang di website UMKM |

Website adalah pusatnya; ketiga saluran ini membawa bukti yang sama ke tempat berbeda.

s.id dipilih karena diluncurkan PANDI dan sudah memiliki lapisan anti-penyalahgunaan — telah memblokir lebih dari 26.000 akun bermasalah dan bekerja sama dengan IDADX, Netcraft, PhishLabs, PhishTank, SURBL, dan VirusTotal.

### Lapis 3 — Penjenjangan dan halaman publik

**3.1 Dua tingkat verifikasi**

| Tingkat | Kredensial | Yang dinyatakan |
|---|---|---|
| **Kontak Terverifikasi** | EID Membership Lv1 | Email dan nomor telepon terverifikasi. Identitas pemilik belum diverifikasi |
| **Identitas Terverifikasi** | KYC Verification by PSrE | Identitas pemilik terverifikasi hingga tingkat Penyelenggara Sertifikasi Elektronik |

Lencana tingkat bawah wajib menyatakan batasnya secara jujur. Tidak boleh menuliskan "terverifikasi" tanpa kualifikasi untuk tingkat Kontak.

**3.2 Jalur naik yang terlihat**
Halaman hasil milik pemilik menampilkan apa yang belum terverifikasi dan bagaimana menaikkannya. Kepercayaan dibangun bertahap, bukan gerbang sekaligus — ini yang membuat adopsi mungkin.

Ajakan naik tingkat hanya muncul di halaman pemilik, tidak pernah di halaman publik yang dilihat konsumen.

**3.3 Halaman verifikasi publik**
Dibuat **per domain**, bukan per orang. Menyatukan ketiga bukti dalam satu tampilan yang dapat dibuka tanpa akun.

---

## 5. Integrasi e.id

Peserta berperan sebagai **verifier**, sesuai arahan panitia.

### Model kerja

Aplikasi menentukan di depan skema apa yang diminta; sesi verifikasi terkunci pada skema tertentu sejak awal. Aplikasi tidak menebak kartu apa yang dibawa pengguna.

Karena itu, penjenjangan dua tingkat diimplementasikan sebagai **dua Verification Schema terpisah**, dan pemilik memilih sendiri di layar pendaftaran mana yang akan dipresentasikan.

### Alur teknis

1. Aplikasi membuat Verification Schema berisi `expected_schemas` dan `required_fields` — dilakukan sekali di awal
2. Pemilik memilih tingkat verifikasi di layar pendaftaran
3. Aplikasi memulai sesi lewat `POST /api/v1/verifier/presentation/request` dengan `verifier_doc_schema_id` yang sesuai
4. Aplikasi menampilkan QR; pemilik memindainya dengan aplikasi dompet e.id
5. Status berubah menjadi `WAITING_APPROVAL`; pemilik menyetujui atau menolak di ponselnya
6. Aplikasi melakukan polling ke `GET /api/v1/verifier/presentation/simple/{id}`
7. Setelah `APPROVED`, aplikasi **segera** mengambil hasil dan menyimpannya ke basis data

**Persetujuan berada di tangan pemilik data**, bukan otomatis saat QR dipindai. Ini sejalan dengan prinsip produk: pemilik yang memutuskan membuktikan dirinya, bukan sistem yang membuka datanya.

### Dua alur QR yang berbeda

| Alur | Siapa | Butuh dompet e.id |
|---|---|---|
| Pendaftaran | Pemilik UMKM membuktikan identitasnya | Ya, sekali di awal |
| Pemeriksaan | Konsumen memindai QR di kemasan | Tidak — kamera biasa, membaca halaman publik |

### Batasan yang memengaruhi desain

Data hasil hanya dapat diambil selama `presentation_ttl` masih hidup (contoh dokumentasi: 300 detik). Karena itu hasil verifikasi **wajib disimpan ke basis data segera setelah `APPROVED`** — bukan disimpan di memori, dan tidak boleh ditunda.

Polling dipilih daripada webhook. Dokumentasi e.id sendiri menyarankan polling untuk kasus sederhana, dan webhook menuntut URL publik serta menambah komponen yang tidak diperlukan.

### 🔲 Yang dilengkapi pada hari pelaksanaan

- Nama dan `schema_id` skema yang sebenarnya
- Nama field persis di dalam `credentialSubject`
- Lingkungan yang berlaku: sandbox (`gateway-sandbox.e.id`) atau produksi (`gateway.e.id`)
- Apakah skema bersifat publik atau memerlukan `private_code`

---

## 6. Sumber data

| Sumber | Kredensial | Status |
|---|---|---|
| RDAP PANDI | Tidak perlu | Terverifikasi dapat dipanggil |
| Sertifikat SSL | Tidak perlu | Dibaca langsung dari koneksi TLS |
| e.id Verifier API | ClientID + Client Secret | Dibagikan pada hari pelaksanaan |
| s.id API | API key self-serve | Sudah diperoleh |

---

## 7. Di luar cakupan

Tidak dibangun pada versi ini, dan disebutkan agar batasnya jelas:

- **Verifikasi rekening bank.** Memastikan sebuah rekening benar-benar ada dan atas nama siapa hanya mungkin lewat kerja sama dengan payment gateway atau bank
- **Sinyal risiko dari basis data aduan.** Memerlukan kerja sama kelembagaan, dan menuntut kehati-hatian: rekening penipu baru selalu bersih, sehingga "tidak ada laporan" tidak boleh ditampilkan sebagai jaminan
- **Verifikasi organisasi lewat e.id.** KYC e.id saat ini masih sebatas perorangan
- **Infrastruktur seal yang tersemat di situs pihak ketiga.** Versi ini hanya menghasilkan asetnya
- **Pengguna kelembagaan** (koperasi, marketplace, program pembiayaan) sebagai penyaring calon mitra

---

## 8. Posisi terhadap layanan yang sudah ada

**CekRekening.id (Komdigi)** memiliki fitur whitelist yang memberi UMKM centang biru beserta QR code, melalui verifikasi faktual manual. Bentuk keluarannya serupa.

Perbedaannya: CekRekening.id memverifikasi **rekening** secara manual dan menghasilkan lencana berupa gambar. cekusaha.id memverifikasi **domain beserta pemiliknya** secara otomatis dan kriptografis, menghasilkan bukti bertanda tangan yang gagal bila dipalsukan.

Keduanya melayani titik yang berbeda dalam perjalanan pembeli: CekRekening.id pada titik transfer, cekusaha.id pada titik pertama pembeli menemukan usahanya. Keduanya bersanding, bukan bersaing.

**Site seal SSL** yang sudah dikenal sejak akhir 1990-an memiliki bentuk serupa, tetapi keamanannya bergantung pada pengunjung yang bersedia mengklik dan memeriksa. Bukti pada cekusaha.id diperiksa mesin, dan gagal bila tanda tangannya tidak cocok.

---

## 9. Arah pengembangan

Disusun berdasarkan **kekuatan bukti**, bukan kemudahan membangun.

1. **Bukti positif tervalidasi** — kendali domain, identitas perorangan, organisasi dari sertifikat *(versi ini)*
2. **Pencocokan silang** — nama pemilik rekening dibandingkan dengan identitas e.id. Masih pernyataan positif; memerlukan kerja sama payment gateway
3. **Sinyal risiko** — catatan aduan dari CekRekening.id dan IDADX. Ditampilkan hanya saat ada, tidak pernah sebagai jaminan saat tidak ada
4. **Pengguna kelembagaan** — cabang ke samping, memakai verifier yang sama untuk pengguna berbeda

---

## 10. Risiko

| Risiko | Mitigasi |
|---|---|
| Lingkungan e.id (sandbox vs produksi) tidak cocok dengan dompet peserta | Ditanyakan ke panitia sebelum menulis kode |
| Propagasi DNS domain baru | VPS memiliki IP publik untuk pengembangan; produk akhir tetap diakses lewat domain |
| Data verifikasi hilang setelah TTL | Disimpan ke basis data segera setelah `APPROVED` |
| Gateway e.id padat karena dipakai serentak | Data hasil disimpan lokal, halaman publik tidak memanggil ulang API |

---

## 11. Kriteria keberhasilan

Versi ini dianggap berhasil bila seorang pemilik UMKM dapat, dalam satu sesi tanpa bantuan:

1. Membuktikan kepemilikan domainnya
2. Memverifikasi identitasnya lewat e.id
3. Memperoleh halaman publik beserta QR dan tautan pendek

dan seorang calon pembeli dapat membuka halaman tersebut dari QR, tanpa akun dan tanpa aplikasi, lalu memahami apa yang telah dan belum diverifikasi.
