/**
 * Skrip uji manual. Bukan bagian aplikasi.
 * Jalankan: node scripts/uji-sumber-data.mts
 */
import { ambilRdap } from "../src/lib/rdap.ts";
import { ambilSertifikat } from "../src/lib/sertifikat.ts";

const domains = process.argv.slice(2);
const daftar = domains.length ? domains : ["kicassl.id", "kalaweb.id"];

for (const d of daftar) {
  console.log("\n" + "=".repeat(72));
  console.log("DOMAIN:", d);
  console.log("=".repeat(72));

  console.log("\n--- RDAP ---");
  console.log(JSON.stringify(await ambilRdap(d), null, 2));

  console.log("\n--- SERTIFIKAT TLS ---");
  console.log(JSON.stringify(await ambilSertifikat(d), null, 2));
}
