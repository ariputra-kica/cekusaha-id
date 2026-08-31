# Cara deploy cekusaha.id

Catatan operasional. Ditulis 31 Agustus 2026.

## Server

| | |
|---|---|
| Akses | `ssh cekusaha` (masuk sebagai root) |
| Folder proyek | `/var/www/cekusaha-id` |
| Layanan | systemd, `cekusaha`, jalan di port 3000 |
| Web server | nginx, reverse proxy ke 3000 |
| Sertifikat | Let's Encrypt lewat certbot, perpanjang otomatis |
| Node | **v25.6.1 tepat**, dipasang lewat fnm |

Node dikunci di v25.6.1 karena aplikasi memakai `node:sqlite`, modul bawaan
yang masih berstatus percobaan. Versi lama membutuhkan tanda khusus saat
dijalankan. Jangan ganti versinya tanpa menguji ulang.

Ubuntu minimal di VPS ini tidak membawa `libatomic1`, padahal Node
membutuhkannya. Paket itu sudah dipasang. Kalau server diganti, itu yang
pertama akan gagal.

## Langkah deploy

```bash
ssh cekusaha
cd /var/www/cekusaha-id
git pull --ff-only
npm ci            # bukan npm install, supaya versinya persis
npm run build     # harus berhasil sebelum lanjut
systemctl restart cekusaha
systemctl is-active cekusaha
```

Periksa dari luar:

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://cekusaha.id/
```

## Kredensial

`.env.local` di server dibuat manual dan tidak pernah ter-commit. Isinya
`EID_BASE_URL`, `EID_CLIENT_ID`, `EID_CLIENT_SECRET`, `SID_API_KEY`, dan
`APP_BASE_URL`. Kalau server dibuat ulang, berkas ini harus dibuat lagi.

Aplikasi berjalan sebagai root. Itu keputusan sadar untuk lomba satu hari,
bukan kelalaian: membuat user terpisah menambah urusan izin yang sulit
diperbaiki sendiri saat buntu.

## Basis data

SQLite di `data/cekusaha.db`, dibuat sendiri oleh aplikasi saat pertama
jalan. Diabaikan git, jadi basis data server terpisah dari laptop. Skema
memakai `CREATE TABLE IF NOT EXISTS`, jadi kolom baru aman ditambahkan.

Melihat isinya:

```bash
cd /var/www/cekusaha-id
node -e '
const {DatabaseSync}=require("node:sqlite");
const db=new DatabaseSync("data/cekusaha.db");
console.log(db.prepare("SELECT domain,dcv_status,diterbitkan_pada FROM domain").all());
'
```
