/**
 * Uji aturan penyatuan dua tingkat lewat holder_did.
 * Jalankan: node scripts/uji-penyatuan.mts
 */
import { dompetSama } from "../src/lib/eid.ts";
import { ambilDb } from "../src/lib/db.ts";

const D = "uji-penyatuan.test";
const DOMPET_A = "did:eid:AAAAsatu";
const DOMPET_B = "did:eid:BBBBdua";
const db = ambilDb();

const bersihkan = () => db.prepare("DELETE FROM identitas WHERE domain = ?").run(D);
const pasang = (tingkat: string, did: string) =>
  db.prepare(
    `INSERT OR REPLACE INTO identitas (domain,tingkat,holder_did,dibuat_pada)
     VALUES (?,?,?,?)`,
  ).run(D, tingkat, did, new Date().toISOString());

const periksa = (judul: string, hasil: boolean, harusnya: boolean) =>
  console.log(`  ${hasil === harusnya ? "LULUS" : "GAGAL"}  ${judul}`);

bersihkan();
console.log("1. Belum ada tingkat lain — apa pun boleh masuk");
periksa("dompet A diterima", dompetSama(D, "kontak", DOMPET_A), true);

bersihkan();
pasang("kontak", DOMPET_A);
console.log("\n2. Kontak sudah terdaftar dengan dompet A");
periksa("identitas dari dompet A DITERIMA", dompetSama(D, "identitas", DOMPET_A), true);
periksa("identitas dari dompet B DITOLAK", dompetSama(D, "identitas", DOMPET_B), false);

bersihkan();
pasang("identitas", DOMPET_B);
console.log("\n3. Urutan terbalik — identitas dulu dengan dompet B");
periksa("kontak dari dompet B DITERIMA", dompetSama(D, "kontak", DOMPET_B), true);
periksa("kontak dari dompet A DITOLAK", dompetSama(D, "kontak", DOMPET_A), false);

bersihkan();
pasang("kontak", DOMPET_A);
console.log("\n4. Memperbarui tingkat yang sama tidak membandingkan dirinya sendiri");
periksa("kontak dari dompet A lagi DITERIMA", dompetSama(D, "kontak", DOMPET_A), true);

bersihkan();
console.log("\nbaris uji dibersihkan");
