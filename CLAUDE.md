# CLAUDE.md — cekusaha.id

## Konteks

Aplikasi verifikasi kepercayaan untuk UMKM. Pemilik membuktikan kendali atas domain .id miliknya (DNS TXT), lalu menautkan identitas terverifikasi dari e.id. Hasilnya satu halaman verifikasi publik per domain yang bisa diperiksa siapa saja tanpa akun.

Dibangun untuk lomba .id Vibe Coding 2026, satu hari, satu orang. Detail produk ada di `PRD-cekusaha.md`.

---

## Cara bekerja dengan saya

Saya **bukan programmer**. Saya mengarahkan, kamu yang menulis kode.

- Jelaskan dalam bahasa awam. Jangan asumsikan saya bisa membaca stack trace atau menebak maksud pesan error.
- Kalau kamu **tidak yakin** tentang sesuatu — nama endpoint, bentuk respons, perilaku pustaka — **katakan tidak yakin**. Jangan menebak. Tebakan yang terdengar meyakinkan lebih berbahaya bagi saya daripada jawaban "saya tidak tahu", karena saya tidak punya cara memverifikasinya.
- Kalau ada dua cara, pilih yang **paling sedikit bagian bergeraknya**, bukan yang paling elegan.
- Kalau satu masalah tidak selesai setelah beberapa percobaan, **bilang terus terang** dan tawarkan menulis ulang dari nol dengan pendekatan berbeda. Jangan menggali terus.

---

## Stack — TERKUNCI

- **Next.js + TypeScript**, satu proyek full-stack
- **SQLite**, satu file dalam proyek
- **VPS Ubuntu**, deploy langsung tanpa container

### Jangan tambahkan komponen

Jangan menyarankan atau memasang: Docker, Redis, ORM tambahan, library state management, message queue, layanan pihak ketiga di luar yang disebut di bawah, atau framework CSS di luar yang sudah terpasang.

Alasannya bukan preferensi gaya: setiap komponen tambahan adalah titik kegagalan yang **tidak bisa saya perbaiki sendiri** saat kamu buntu. Kalau menurutmu sebuah komponen benar-benar diperlukan, jelaskan dulu kenapa dan tunggu persetujuan saya.

TypeScript dipakai dalam mode longgar. Kalau error tipe menghambat lebih dari beberapa menit, longgarkan tipenya — jangan menghabiskan waktu memuaskan compiler.

---

## Fakta API — jangan ditebak

Semua di bawah ini sudah diverifikasi. **Kalau ada yang tidak tertulis di sini, jangan mengarang** — bilang saja belum diketahui.

### RDAP PANDI

```
GET https://rdap.pandi.id/rdap/domain/{domain}
Accept: application/rdap+json
```

Tanpa kredensial. Mengembalikan: `events` (registration, expiration, last changed), `status`, entity `registrar` (nama + PANDI Registrar ID), entity `abuse` (kontak abuse registrar), `secureDNS`, `premiumDomain`.

**Data registrant diredaksi total** — tidak ada entity `registrant`. Ini bukan bug, ini praktik standar. Jangan mencoba mencarinya lewat cara lain.

`registrar` adalah perusahaan penyedia jasa pendaftaran, **bukan pemilik domain**. Jangan pernah melabelinya sebagai pemilik di UI.

### e.id Verifier API

Base URL: `https://gateway.e.id` (produksi) atau `https://gateway-sandbox.e.id` (sandbox).
🔲 *Mana yang berlaku ditentukan hari-H.*

Tiga konsep yang berbeda dan jangan tertukar:
- **Document Schema** — milik penerbit, hanya baca
- **Verification Schema** — milik kita, dibuat sekali, dipakai berulang. Berisi `expected_schemas` (daftar) + `required_fields`
- **Presentation (VP)** — satu sesi verifikasi nyata, masa hidup pendek

Alur yang dipakai (arah utama — aplikasi menampilkan QR, dompet memindai):

1. `POST /api/v1/verifier/presentation/request` dengan `verifier_doc_schema_id` → dapat URL dompet + `challenge` + `qr_token`. Tampilkan sebagai QR.
2. Pemilik memindai → status `WAITING_APPROVAL`
3. Pemilik menyetujui/menolak di ponselnya → `APPROVED` / `REJECTED`
4. Ambil hasil via VP Result dengan session id

**Polling, bukan webhook.** `GET /api/v1/verifier/presentation/simple/{id}`. Jangan memasang webhook — butuh URL publik dan menambah komponen.

**⚠️ ATURAN KRITIS: masa hidup data hasil hanya ~300 detik.** Begitu status `APPROVED`, ambil dan **simpan ke SQLite segera**. Jangan menyimpan hanya di memori, jangan menunda. Lewat batas itu hasilnya hilang permanen.

Field saat `APPROVED`: `holder_did`, `presentation.credentialSubject`, `presentation.issuer`, `presentation.issuanceDate`, `presentation.credentialStatus`, `session_id`, `status`, `retrieved_at`.

🔲 **Nama dan ID skema asli belum diketahui.** Tidak ada di dokumentasi. Diisi hari-H setelah memanggil daftar skema.

### s.id

```
POST https://api.s.id/v2/links
Authorization: Bearer sk_live_...
Body: {"long_url": "...", "custom_slug": "..."}
```

Batas 38 request/menit. **Buat tautan sekali saat pendaftaran, simpan hasilnya.** Jangan memanggil ulang setiap halaman dibuka.

Jangan pakai webhook, OAuth, atau MCP server dari s.id.

---

## Halaman aplikasi

- **Halaman depan = kotak reverse lookup.** Tidak ada landing terpisah. Pengunjung langsung melihat gunanya, dan pertahanan anti-transplantasi jadi wajah depan.
- **Halaman pendaftaran** (sisi pemilik, alur 4 langkah: input domain + DCV → e.id + RDAP + SSL → preview → terbitkan)
- **Halaman A** — hasil pemilik, privat. Berisi QR, tautan pendek, seal.
- **Halaman B** — verifikasi publik, satu per domain. Inti produk.

---

## Data per domain — PUBLIK vs INTERNAL

**Aturan: tidak ada data tak terverifikasi di Halaman B.** Setiap yang tampil harus punya sumber yang bisa ditunjuk.

**Domain & kepemilikan**
- Nama domain — **PUBLIK** (subjek utama halaman)
- Status DCV + waktu pembuktian — **PUBLIK**
- Token DCV — **INTERNAL & FANA.** Setelah kepemilikan terbukti, token tak berguna lagi. Jangan disimpan permanen.

**Identitas (e.id)**
- Tingkat identitas yang terbukti (kontak / identitas) — **PUBLIK.** Ditentukan dari skema yang diverifikasi, bukan dari field "tier" (Verifier API tidak mengembalikan tier).
- `holder_did`, `session_id`, `credentialStatus`, `retrieved_at`, `issuer`, `issuanceDate` — **INTERNAL**
- `credentialSubject` — **SEBAGIAN PUBLIK.** ⚠️ Nama boleh tampil. **NIK penuh dan alamat JANGAN.** Tidak ada kontrol keterbukaan di MVP, jadi apa yang di-render adalah keputusan sadar — jangan menampilkan semua field yang kebetulan ada.

**SSL**
- Jenis validasi (DV/OV), penerbit, nama organisasi bila OV — **PUBLIK**

**RDAP**
- Tanggal registrasi dan registrar — **PUBLIK**, sebagai detail sekunder yang kalem, tidak bersaing dengan tiga pilar
- DNSSEC dan sisanya — tidak ditampilkan

**Meta**
- Waktu pemeriksaan terakhir — **PUBLIK**
- Tautan pendek s.id — **PUBLIK**
- Status terbit — **INTERNAL**

---

## Server vs browser

**Semua panggilan ke layanan luar** (e.id, RDAP, s.id, pembacaan sertifikat SSL, pemeriksaan DNS) **dan semua kredensial dijalankan di server.** Tidak pernah di browser.

---

## Arah desain

Tujuan: jangan terlihat seperti template default keluaran AI. Semua peserta memakai AI, jadi risiko seragam itu nyata. Desain bukan fokus utama — cukup patuhi keputusan di bawah lalu berhenti.

**Kesan:** solid, tenang, tepercaya, jelas, modern. Seperti lembaga yang bisa dipercaya tapi ramah.

**Warna**
- **Latar halaman TERANG.** Halaman B dibuka lewat ponsel di luar ruangan di bawah matahari. Jangan membuat mode gelap penuh.
- Warna merek gelap dan tegas (abu arang atau biru dongker sangat gelap) untuk kepala halaman, tombol, dan aksen — bukan untuk latar.
- **Hijau disimpan KHUSUS untuk penanda status terverifikasi.** Jangan dipakai sebagai warna merek. Warna yang membawa arti harus langka supaya tetap berarti.
- **Aksen: terracotta / oranye bata kalem.** Hanya untuk elemen interaktif dan penekanan (tautan, tombol sekunder) — **tidak pernah untuk menandai status.**
- Jangan pakai gradien ungu-ke-biru atau palet pelangi.

**Tipografi**
- **Plus Jakarta Sans** (Google Fonts), satu keluarga, konsisten. Jangan tambah font judul kedua.

**Pola yang wajib dihindari** (ciri khas keluaran AI)
- Gradien ungu-ke-biru, glassmorphism, bayangan kartu seragam, emoji sebagai ikon, sudut membulat berlebihan, hero generik
- **Jangan membuat tiga pilar sebagai kartu dengan ikon dalam kotak pastel di pojok.** Buat sebagai baris yang dipisahkan garis tipis.
- **Jangan pakai ikon centang atau perisai besar sebagai hiasan.** Centang hanya boleh melekat pada pernyataan spesifik, bukan berdiri sendiri.

**Keadaan negatif dan sebagian — paling penting**
- "Belum terverifikasi" pakai **abu netral, BUKAN merah.** Merah menuduh, dan sebagian besar domain memang belum mendaftar.
- **DV ditampilkan dengan bobot visual sama seperti OV**, hanya isinya berbeda. Jangan pakai kuning atau warna peringatan untuk DV. DV bukan kekurangan.

**Halaman B khususnya:** nama domain jadi elemen paling menonjol. Tiga pilar terbaca dalam sekali pandang. Pengunjung paham status dalam dua detik tanpa membaca detail.

---

## Aturan UI — tidak boleh dilanggar

Ini bukan preferensi desain. Melanggarnya merusak inti produk.

- **Jangan menampilkan data yang tidak terverifikasi di halaman yang menyatakan "terverifikasi".** Setiap yang tampil harus punya sumber yang bisa ditunjuk.
- **Domain yang belum terdaftar bukan "tidak aman".** Gunakan bahasa netral: "belum terverifikasi di cekusaha.id". Sebagian besar domain memang belum mendaftar; menyiratkan kecurigaan berarti memfitnah bisnis jujur.
- **Jangan menampilkan logo Certificate Authority.** Penerbit sertifikat ditampilkan sebagai teks saja.
- **DV bukan kekurangan.** Kehadiran organisasi pada OV adalah sinyal positif; ketiadaannya bukan sinyal negatif.
- **Selalu tampilkan waktu pemeriksaan terakhir** untuk data yang berasal dari salinan tersimpan.
- **Semua data di Halaman B berasal dari salinan tersimpan**, termasuk RDAP dan sertifikat SSL. Jangan menembak API pihak ketiga setiap halaman dibuka — berisiko lambat dan kena batas laju saat Halaman B dibuka berulang di depan juri. Penyegaran berkala masuk visi, bukan MVP.

---

## Git dan kredensial

**Repo bersifat PUBLIK.** Konsekuensinya keras:

- **Jangan pernah menaruh kredensial di dalam kode atau berkas yang ter-commit.** ClientID e.id, Client Secret, dan API key s.id semuanya lewat environment variable.
- Tidak cukup "tidak terlihat" — tidak boleh **pernah** ter-commit sama sekali. Riwayat Git menyimpan segalanya, dan menghapusnya belakangan itu rumit.
- **`.gitignore` yang memuat `.env` dan `.env.local` dibuat di commit pertama**, sebelum ada berkas kredensial apa pun. Jangan menyusulkannya.
- Kalau kamu perlu menaruh nilai contoh, pakai `.env.example` berisi nama variabel tanpa nilainya.

Riwayat commit **diperiksa juri**. Perlakukan serius.

- Commit sering dan kecil, setiap satu bagian selesai dan jalan
- Pesan commit dalam bahasa manusia yang menjelaskan apa yang berubah, bukan "update" atau "fix"
- Jangan menumpuk banyak perubahan dalam satu commit besar
- Commit pertama tidak boleh mendahului waktu mulai lomba (Senin pukul 10.00)

---

## Deploy

Deploy percobaan aplikasi kosong **dilakukan sangat awal** — target HTTPS hidup pukul 11.30 Senin, sebelum ada fitur apa pun. Pastikan `next build` berhasil di VPS.

Urutan pagi: tiga panggilan e.id dulu (10–15 menit, untuk memunculkan pertanyaan yang butuh jawaban panitia), lalu deploy kosong sampai hijau, baru sisanya.

Aplikasi harus live di domain .id yang diberikan panitia, di VPS IDCloudHost.

**Target:** fitur selesai pukul 17.00 Senin. Sisanya untuk merapikan, merekam video, dan berlatih pitch. Code freeze pukul 10.00 Selasa.
