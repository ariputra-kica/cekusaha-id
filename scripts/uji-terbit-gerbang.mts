/**
 * Uji bahwa halaman publik, seal, dan QR sama-sama menuntut status terbit.
 * Jalankan: node scripts/uji-terbit-gerbang.mts
 */
import { bacaDataPublik } from "../src/lib/publik.ts";
import { ambilDb } from "../src/lib/db.ts";

const D = "uji-gerbang.test";
const db = ambilDb();
const now = () => new Date().toISOString();
const bersihkan = () => {
  for (const t of ["identitas", "aset", "sesi_eid", "domain"])
    db.prepare(`DELETE FROM ${t} WHERE domain = ?`).run(D);
};
const pasang = (status: string, terbit: string | null) => {
  db.prepare(
    "INSERT OR REPLACE INTO domain (domain,dcv_status,dcv_dibuat_pada,dcv_terbukti_pada,diterbitkan_pada) VALUES (?,?,?,?,?)",
  ).run(D, status, now(), status === "terbukti" ? now() : null, terbit);
};

let gagal = 0;
const cek = (judul: string, dapat: boolean, harus: boolean) => {
  const lulus = dapat === harus;
  if (!lulus) gagal++;
  console.log(`  ${lulus ? "LULUS" : "GAGAL"}  ${judul}`);
};

bersihkan();
cek("tidak terdaftar: tidak punya halaman", bacaDataPublik(D).terdaftar, false);

bersihkan(); pasang("menunggu", null);
cek("menunggu DCV: tidak punya halaman", bacaDataPublik(D).terdaftar, false);

bersihkan(); pasang("terbukti", null);
cek("terbukti tapi BELUM diterbitkan: tidak punya halaman", bacaDataPublik(D).terdaftar, false);

bersihkan(); pasang("terbukti", now());
cek("terbukti DAN diterbitkan: punya halaman", bacaDataPublik(D).terdaftar, true);

bersihkan(); pasang("menunggu", now());
cek("diterbitkan tapi DCV batal: tidak punya halaman", bacaDataPublik(D).terdaftar, false);

bersihkan();
console.log(gagal === 0 ? "\n  Semua lulus. Baris uji dibersihkan." : `\n  ${gagal} gagal.`);
