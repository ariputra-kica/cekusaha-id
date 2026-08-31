# PRD cekusaha.id

**Product Requirements Document**
Disusun: 29 Agustus 2026
Peserta: Ari Widya Putra (individu)
Acara: .id Vibe Coding 2026 oleh PANDI, 31 Agustus sampai 1 September 2026

---

## 1. Ringkasan

cekusaha.id memungkinkan pemilik UMKM membuktikan bahwa sebuah domain .id benar miliknya, dan bahwa ada orang terverifikasi di baliknya, lalu menerbitkan bukti itu dalam bentuk yang bisa diperiksa siapa saja dalam hitungan detik.

Satu kalimat: **aplikasi ini memungkinkan pemilik UMKM menautkan identitas e.id-nya ke domain .id miliknya, dan menerbitkan bukti yang dapat diverifikasi publik.**

---

## 2. Masalah

Domain .id ada untuk website. Tetapi mayoritas UMKM Indonesia tidak punya website. Mereka berjualan lewat marketplace dan WhatsApp.

Penyebabnya bukan teknologi. Hari ini AI dapat membuatkan website dalam hitungan menit. Yang tidak dapat dibuatkan AI adalah **kepercayaan**.

Di marketplace, kepercayaan itu **disewa** dari platform. Centang biru, rating, dan sistem escrow adalah milik platform, berlaku hanya di dalam platform, dan hilang begitu penjual pindah. Website sendiri tidak punya apa pun yang setara.

### Bukti-bukti itu sebenarnya sudah ada, tapi tidak terlihat

| Bukti | Di mana | Kenapa tidak terlihat pembeli |
|---|---|---|
| Domain terdaftar sah | Registry .id | RDAP meredaksi data registrant (praktik standar pasca-GDPR). Domain .id tingkat teratas juga tidak menuntut syarat identitas |
| Organisasi tervalidasi | Sertifikat SSL (OV/EV) | Browser sudah menghapus indikator EV. Nama organisasi kini harus dicari sampai detail Certificate Information |
| Identitas pemilik terverifikasi | Dompet e.id | Tersimpan privat di dompet pemiliknya, tidak terhubung ke lapaknya |

Ketiganya ada, tersebar di tiga tempat, dan tidak satu pun tampil di depan calon pembeli.

### Kenapa masalah ini pantas dipecahkan sekarang

Kepercayaan adalah penghalang terakhir yang tersisa bagi UMKM untuk berdiri sendiri secara digital. Selama satu-satunya sumber kepercayaan adalah platform, UMKM akan terus menyewa alih-alih memiliki.

---

## 3. Target pengguna

### Pengguna utama

**Pemilik UMKM yang punya atau sedang membangun website di domain .id.** Sudah berjualan lewat media sosial atau marketplace, ingin punya kanal sendiri, tetapi kehilangan sinyal kepercayaan begitu keluar dari platform.

Karakteristik yang membentuk desain: bukan orang teknis, waktu terbatas, dan tidak akan menyelesaikan proses verifikasi panjang di hari pertama.

### Pengguna kedua

**Calon pembeli.** Menemukan sebuah toko .id yang belum dikenalnya dan ingin memastikan sebelum bertransaksi. Tidak punya akun apa pun, tidak akan memasang aplikasi.

### Bukan untuk

- Perusahaan besar yang sudah punya kanal kepercayaan sendiri
- Pemilik domain yang menuntut anonimitas
- Kasus penindakan atau pelaporan penipuan, karena cekusaha.id menampilkan bukti positif dan tidak menuduh siapa pun

---

## 4. Fitur utama

Disusun berdasarkan prioritas pembangunan. Lapis yang lebih rendah dibuang lebih dulu bila waktu tidak mencukupi.

### Lapis 1: Inti

**1.1 Validasi kepemilikan domain**
Aplikasi menerbitkan token, pemilik memasangnya sebagai DNS TXT record, aplikasi memverifikasi lewat satu query DNS. Tanpa langkah ini, siapa pun dapat mendaftarkan domain milik orang lain.

Metode ini sengaja meniru Domain Control Validation yang dipakai Certificate Authority. Ini standar industri, bukan mekanisme karangan.

Kueri dikirim langsung ke server DNS resmi domain yang bersangkutan, bukan lewat resolver perantara yang menyimpan cache. Konsekuensinya terukur: pada pengujian, kepemilikan terbukti sekitar **31 detik** setelah TXT record dipasang. Lewat resolver umum, jeda yang sama bisa berlangsung menit sampai jam, dan pemilik akan mengira proses pendaftarannya gagal.

**1.2 Pemeriksaan data domain (RDAP)**
Memanggil `rdap.pandi.id/rdap/domain/{domain}` untuk menampilkan tanggal registrasi dan kedaluwarsa, status DNSSEC, registrar, dan status premium. Publik, tanpa kredensial.

**1.3 Pembacaan sertifikat SSL**
Membaca sertifikat dari koneksi TLS untuk menampilkan jenis validasi (DV/OV/EV), penerbit, dan nama organisasi bila ada.

Ditampilkan sebagai teks, netral terhadap penerbit, tanpa logo CA mana pun. **Kehadiran organisasi adalah sinyal positif; ketiadaannya bukan sinyal negatif**. Mayoritas situs sah memakai DV.

**1.4 Verifikasi identitas lewat e.id**
Lihat bagian 5.

**1.5 Alur pendaftaran**
Satu jalur menurun, tanpa cabang dan tanpa langkah pratinjau terpisah:

1. Pemilik memasukkan nama domainnya
2. Membuktikan kepemilikan dengan memasang DNS TXT record yang diterbitkan aplikasi
3. Begitu kepemilikan terbukti, aplikasi langsung mengambil data RDAP dan membaca sertifikat situs, lalu menyimpan keduanya. Pemilik tidak melakukan apa pun di langkah ini
4. Verifikasi **Kontak Terverifikasi** lewat e.id. Wajib
5. Verifikasi **Identitas Terverifikasi** lewat e.id. Opsional, dan boleh ditambahkan kapan saja sesudahnya
6. Simpan dan terbitkan halaman verifikasi publiknya

Langkah 3 sengaja dijalankan sekali di titik itu, bukan setiap halaman publik dibuka. Halaman publik akan dibuka berulang kali; menembak RDAP dan sertifikat tiap kali berarti lambat dan berisiko kena batas laju.

**1.6 Halaman hasil**
Satu halaman berisi seluruh bukti yang berhasil dikumpulkan.

### Lapis 2: Tiga saluran distribusi

Halaman hasil menyediakan tiga aset siap pakai, semuanya menuju halaman verifikasi publik yang sama:

| Aset | Untuk |
|---|---|
| **QR code** | Dicetak, ditempel di kemasan atau etalase fisik |
| **Tautan pendek s.id** | Bio media sosial |
| **Seal + kode semat** | Dipasang di website UMKM |

Website adalah pusatnya; ketiga saluran ini membawa bukti yang sama ke tempat berbeda.

s.id dipilih karena diluncurkan PANDI dan sudah memiliki lapisan anti-penyalahgunaan. Layanan itu telah memblokir lebih dari 26.000 akun bermasalah dan bekerja sama dengan IDADX, Netcraft, PhishLabs, PhishTank, SURBL, dan VirusTotal.

### Lapis 3: Penjenjangan dan halaman publik

**3.1 Dua tingkat verifikasi**

Keduanya bukan dua pilihan sejajar, melainkan dua anak tangga.

| Tingkat | Kredensial | Yang dinyatakan | Sifat |
|---|---|---|---|
| **Kontak Terverifikasi** | EID Membership Lv1 | Email dan nomor telepon terverifikasi. Identitas pemilik belum diverifikasi | Tingkat masuk, **wajib** dan harus selesai lebih dulu |
| **Identitas Terverifikasi** | KYC Verification by PSrE | Identitas pemilik terverifikasi hingga tingkat Penyelenggara Sertifikasi Elektronik | **Opsional**, terkunci sampai Kontak selesai, boleh ditambahkan kapan saja |

Kontak dijadikan syarat masuk karena itulah pintu yang paling murah dilewati pemilik usaha di hari pertama. Menuntut identitas perorangan di depan pintu berarti kehilangan mereka yang belum siap menyerahkannya, padahal bukti kepemilikan domainnya sendiri sudah bernilai.

Identitas tidak pernah menjadi syarat menerbitkan. Pemilik boleh menerbitkan halaman publiknya dengan tingkat Kontak saja, lalu menaikkannya berminggu-minggu kemudian tanpa mendaftar ulang.

Lencana tingkat bawah wajib menyatakan batasnya secara jujur. Tidak boleh menuliskan "terverifikasi" tanpa kualifikasi untuk tingkat Kontak.

**3.2 Jalur naik yang terlihat**
Halaman hasil milik pemilik menampilkan apa yang belum terverifikasi dan bagaimana menaikkannya. Kepercayaan dibangun bertahap, bukan gerbang sekaligus. Itu yang membuat adopsi mungkin.

Ajakan naik tingkat hanya muncul di halaman pemilik, tidak pernah di halaman publik yang dilihat konsumen.

**3.3 Halaman verifikasi publik**
Dibuat **per domain**, bukan per orang. Menyatukan ketiga bukti dalam satu tampilan yang dapat dibuka tanpa akun.

Halaman ini baru ada setelah pemiliknya menerbitkannya. Domain yang kepemilikannya sudah terbukti tapi belum diterbitkan tidak punya halaman publik sama sekali, dan alamatnya menampilkan keadaan "belum terverifikasi" yang sama seperti domain yang tidak pernah mendaftar.

Itu bukan kelalaian teknis melainkan penerapan prinsip yang sama dengan persetujuan di dompet e.id: pemilik yang memutuskan membuktikan dirinya. Membuktikan kepemilikan domain kepada kami tidak otomatis berarti bersedia mengumumkannya.

---

## 5. Integrasi e.id

Peserta berperan sebagai **verifier**, sesuai arahan panitia.

### Model kerja

Aplikasi menentukan di depan skema apa yang diminta; sesi verifikasi terkunci pada skema tertentu sejak awal. Aplikasi tidak menebak kartu apa yang dibawa pengguna.

Karena itu, penjenjangan dua tingkat diimplementasikan sebagai **dua Verification Schema terpisah**, dan sesi dimulai dengan skema yang sesuai tingkatnya. Urutannya tetap: Kontak lebih dulu, Identitas menyusul bila pemilik menghendaki.

### Alur teknis

1. Aplikasi membuat Verification Schema berisi `expected_schemas` dan `required_fields`, dilakukan sekali di awal
2. Pemilik memilih tingkat verifikasi di layar pendaftaran
3. Aplikasi memulai sesi lewat `POST /api/v1/verifier/presentation/request` dengan `verifier_doc_schema_id` yang sesuai
4. Aplikasi menampilkan QR; pemilik memindainya dengan aplikasi dompet e.id
5. Status berubah menjadi `WAITING_APPROVAL`; pemilik menyetujui atau menolak di ponselnya
6. Aplikasi melakukan polling ke `GET /api/v1/verifier/presentation/simple/{id}`
7. Setelah `APPROVED`, aplikasi **segera** mengambil hasil dan menyimpannya ke basis data

**Persetujuan berada di tangan pemilik data**, bukan otomatis saat QR dipindai. Ini sejalan dengan prinsip produk: pemilik yang memutuskan membuktikan dirinya, bukan sistem yang membuka datanya.

### Privasi data identitas

NIK dan tanggal lahir **tidak pernah dikirim ke server kami**. Ini bukan penyaringan setelah data tiba, melainkan batas yang ditentukan sebelum sesi dimulai.

Yang menentukan adalah `required_fields` di dalam Verification Schema milik verifier. Sesi verifikasi terkunci pada skema itu sejak permintaan dibuat, dan dompet hanya melepaskan field yang diminta. Terbukti dari respons e.id yang sebenarnya: pada tingkat Identitas, `credentialSubject` yang kami terima hanya berisi nama dan nama lembaga pemeriksanya. Tidak ada NIK, tidak ada tanggal lahir, tidak ada alamat.

Perbedaan ini penting dan bukan soal istilah. Data yang tidak pernah tiba tidak bisa bocor, tidak bisa diminta aparat, dan tidak bisa terbawa ke cadangan. Data yang tiba lalu dibuang tetap pernah ada.

Batas yang sama berlaku untuk apa yang ditampilkan. Nama boleh tampil di halaman publik; sisa isi kredensial diperlakukan sebagai internal.

### Dua alur QR yang berbeda

| Alur | Siapa | Butuh dompet e.id |
|---|---|---|
| Pendaftaran | Pemilik UMKM membuktikan identitasnya | Ya, sekali di awal |
| Pemeriksaan | Konsumen memindai QR di kemasan | Tidak. Kamera biasa, membaca halaman publik |

### Batasan yang memengaruhi desain

Data hasil hanya dapat diambil selama `presentation_ttl` masih hidup (contoh dokumentasi: 300 detik). Karena itu hasil verifikasi **wajib disimpan ke basis data segera setelah `APPROVED`**, bukan disimpan di memori, dan tidak boleh ditunda.

Polling dipilih daripada webhook. Dokumentasi e.id sendiri menyarankan polling untuk kasus sederhana, dan webhook menuntut URL publik serta menambah komponen yang tidak diperlukan.

### Nilai yang berlaku

Semua di bawah ini diperoleh dengan memanggil API-nya langsung pada 31 Agustus 2026, bukan dari dokumentasi.

**Lingkungan: produksi, `https://gateway.e.id`.** Sandbox tidak dipakai.

**Verification Schema** milik kami, dibuat sekali lalu dipakai berulang. ID-nya bukan rahasia dan boleh tampil di repositori publik.

| Tingkat | Document Schema penerbit | `verifier_doc_schema_id` | `required_fields` |
|---|---|---|---|
| **Kontak Terverifikasi** | EID Membership Lv1 | `179f9489-b6e9-4bfe-9db0-a674ebaeb943` | `email`, `phone_number` |
| **Identitas Terverifikasi** | KYC Verification by PSrE | `074f157d-a743-4647-a39c-358b66da454a` | `fullname`, `verificator` |

Nama field di kolom terakhir persis seperti yang muncul di dalam `credentialSubject`.

**`private_code` tidak diperlukan.** Permintaan presentasi hanya mengirim `verifier_doc_schema_id` dan `expires_in`, dan diterima.

**Satu Verification Schema hanya boleh memuat satu skema.** Mencoba memasukkan dua menghasilkan `HTTP 500` dengan pesan `only single schema is currently supported`. Itulah sebabnya penjenjangan dijalankan sebagai dua sesi terpisah yang disatukan lewat `holder_did` yang sama, bukan satu sesi yang meminta keduanya sekaligus.

---

## 6. Sumber data

| Sumber | Kredensial | Status |
|---|---|---|
| RDAP PANDI | Tidak perlu | Terverifikasi dapat dipanggil |
| Sertifikat SSL | Tidak perlu | Dibaca langsung dari koneksi TLS |
| e.id Verifier API | ClientID + Client Secret | Dibagikan pada hari pelaksanaan |
| s.id API | API key self-serve | Sudah diperoleh |
