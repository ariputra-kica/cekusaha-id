/**
 * Uji syarat penerbitan. Bukan bagian aplikasi.
 * Jalankan: node scripts/uji-terbit.mts
 */
import { keadaanTerbit } from "../src/lib/terbit.ts";
import { ambilDb } from "../src/lib/db.ts";

const D = "uji-terbit.test";
const db = ambilDb();
const now = () => new Date().toISOString();

const bersihkan = () => {
  for (const t of ["identitas", "aset", "sesi_eid", "domain"])
    db.prepare(`DELETE FROM ${t} WHERE domain = ?`).run(D);
};
const pasangDomain = (status: string) =>
  db.prepare(
    "INSERT OR REPLACE INTO domain (domain,dcv_status,dcv_dibuat_pada) VALUES (?,?,?)",
  ).run(D, status, now());
const pasangIdentitas = (tingkat: string) =>
  db.prepare(
    "INSERT OR REPLACE INTO identitas (domain,tingkat,holder_did,dibuat_pada) VALUES (?,?,?,?)",
  ).run(D, tingkat, "did:eid:uji", now());

let gagal = 0;
const cek = (judul: string, dapat: boolean, harus: boolean) => {
  const lulus = dapat === harus;
  if (!lulus) gagal++;
  console.log(`  ${lulus ? "LULUS" : "GAGAL"}  ${judul}`);
};

bersihkan();
cek("domain tidak terdaftar tidak bisa diterbitkan", keadaanTerbit(D).bisa, false);

bersihkan(); pasangDomain("menunggu");
cek("kepemilikan belum terbukti tidak bisa", keadaanTerbit(D).bisa, false);

bersihkan(); pasangDomain("terbukti");
cek("terbukti tapi tanpa kontak belum bisa", keadaanTerbit(D).bisa, false);
console.log(`         alasannya: ${keadaanTerbit(D).alasan}`);

bersihkan(); pasangDomain("terbukti"); pasangIdentitas("identitas");
cek("identitas saja tanpa kontak belum bisa", keadaanTerbit(D).bisa, false);

bersihkan(); pasangDomain("terbukti"); pasangIdentitas("kontak");
cek("terbukti + KONTAK SAJA sudah bisa", keadaanTerbit(D).bisa, true);
cek("belum ditandai terbit", keadaanTerbit(D).sudah, false);

db.prepare("UPDATE domain SET diterbitkan_pada = ? WHERE domain = ?").run(now(), D);
cek("setelah ditandai, tercatat sudah terbit", keadaanTerbit(D).sudah, true);

bersihkan(); pasangDomain("terbukti"); pasangIdentitas("kontak"); pasangIdentitas("identitas");
cek("kontak + identitas juga bisa", keadaanTerbit(D).bisa, true);

bersihkan();
console.log(gagal === 0 ? "\n  Semua lulus. Baris uji dibersihkan." : `\n  ${gagal} gagal.`);
