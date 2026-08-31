/**
 * Uji manual alur DCV. Bukan bagian aplikasi.
 * Jalankan: node scripts/uji-dcv.mts
 */
import {
  mulaiDcv, periksaDcv, bacaKeadaan, AWALAN_TXT, normalisasiDomain,
  bacaTxtLewatDns,
} from "../src/lib/dcv.ts";
import { ambilDb } from "../src/lib/db.ts";

const DOMAIN = process.argv[2] || "cekusaha.id";

const judul = (s: string) => console.log("\n" + "=".repeat(70) + "\n" + s + "\n" + "=".repeat(70));
const tampil = (o: any) => console.log(JSON.stringify(o, null, 2));

// Bersihkan supaya uji bisa diulang.
ambilDb().prepare("DELETE FROM domain WHERE domain = ?").run(DOMAIN);

judul("0. Normalisasi masukan pengguna");
for (const m of ["  HTTPS://WWW.CekUsaha.ID/daftar?a=1  ", "cekusaha.id."]) {
  console.log(JSON.stringify(m), "->", normalisasiDomain(m));
}

judul("1. mulaiDcv — terbitkan token");
const a = mulaiDcv(DOMAIN);
tampil(a);
console.log("\nYang harus dipasang pemilik sebagai TXT record di", a.domain + ":");
console.log("  " + a.nilaiTxt);

judul("2. mulaiDcv lagi — token TIDAK boleh berubah");
const b = mulaiDcv(DOMAIN);
console.log("token pertama :", a.token);
console.log("token kedua   :", b.token);
console.log("sama?         :", a.token === b.token ? "YA (benar)" : "TIDAK (salah)");

judul("3. Cek ulang saat TXT belum dipasang (pembaca palsu, kosong)");
tampil(await periksaDcv(DOMAIN, async () => []));

judul("4. Cek ulang saat ada TXT lain tapi belum cocok");
tampil(await periksaDcv(DOMAIN, async () => [
  "v=spf1 include:_spf.google.com ~all",
  "google-site-verification=abc123",
]));

judul("5. Cek ulang saat TXT yang benar sudah terpasang");
tampil(await periksaDcv(DOMAIN, async () => [
  "v=spf1 include:_spf.google.com ~all",
  AWALAN_TXT + a.token,
]));

judul("6. Keadaan tersimpan setelah terbukti — token harus SUDAH HILANG");
const c = bacaKeadaan(DOMAIN);
tampil(c);
console.log("token masih tersimpan?", c?.token === null ? "TIDAK (benar, fana)" : "YA (SALAH)");

judul("7. Isi mentah baris basis data — bukti token benar-benar NULL");
tampil(ambilDb().prepare("SELECT * FROM domain WHERE domain = ?").get(DOMAIN));

judul("8. Kueri DNS SUNGGUHAN ke " + DOMAIN);
try {
  const txt = await bacaTxtLewatDns(DOMAIN);
  console.log("TXT record yang terbaca:");
  tampil(txt);
} catch (e: any) {
  console.log("GAGAL:", e?.code || e?.message);
  console.log("(di laptop ini kueri DNS langsung diblokir — lihat catatan)");
}
