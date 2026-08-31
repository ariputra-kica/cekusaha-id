import { rapikanTelepon, rapikanNama, rapikanVerificator } from "../src/lib/tampilan.ts";

let gagal = 0;
const cek = (label: string, dapat: any, harus: any) => {
  const lulus = dapat === harus;
  if (!lulus) gagal++;
  console.log(`  ${lulus ? "LULUS" : "GAGAL"}  ${label}`);
  if (!lulus) console.log(`         dapat ${JSON.stringify(dapat)}, harusnya ${JSON.stringify(harus)}`);
};

console.log("Nomor telepon");
cek("62 jadi 0 dan dikelompokkan", rapikanTelepon("628561700647"), "0856-1700-647");
cek("sudah berawalan 0", rapikanTelepon("08123456789"), "0812-3456-789");
cek("dengan +62 dan spasi", rapikanTelepon("+62 812 3456 7890"), "0812-3456-7890");
cek("nomor asing dibiarkan", rapikanTelepon("+14155552671"), "+14155552671");
cek("terlalu pendek dibiarkan", rapikanTelepon("62812"), "62812");
cek("null tetap null", rapikanTelepon(null), null);

console.log("\nNama");
cek("kapital semua dirapikan", rapikanNama("ARI WIDYA PUTRA"), "Ari Widya Putra");
cek("sudah normal tidak disentuh", rapikanNama("Ari Widya Putra"), "Ari Widya Putra");
cek("campuran tidak disentuh", rapikanNama("Ari WIDYA putra"), "Ari WIDYA putra");
cek("spasi ganda dipertahankan", rapikanNama("ARI  PUTRA"), "Ari  Putra");
cek("null tetap null", rapikanNama(null), null);

console.log("\nLembaga pemverifikasi");
cek("privy", rapikanVerificator("privy"), "Privy");
cek("vida", rapikanVerificator("vida"), "VIDA");
cek("tak dikenal dibiarkan", rapikanVerificator("lembaga-lain"), "lembaga-lain");

console.log(gagal === 0 ? "\nSemua lulus." : `\n${gagal} gagal.`);
