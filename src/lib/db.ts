/**
 * Basis data SQLite — satu berkas di dalam proyek.
 *
 * Memakai `node:sqlite`, modul bawaan Node. Tidak ada paket yang dipasang,
 * tidak ada ORM. HANYA DIJALANKAN DI SERVER.
 */

import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";

const BERKAS = path.join(process.cwd(), "data", "cekusaha.db");

let db: DatabaseSync | null = null;

export function ambilDb(): DatabaseSync {
  if (db) return db;

  mkdirSync(path.dirname(BERKAS), { recursive: true });
  db = new DatabaseSync(BERKAS);

  db.exec(`
    CREATE TABLE IF NOT EXISTS domain (
      domain              TEXT PRIMARY KEY,
      -- Token DCV bersifat FANA. Diisi saat menunggu, dikosongkan
      -- (NULL) begitu kepemilikan terbukti. Jangan disimpan permanen.
      dcv_token           TEXT,
      dcv_status          TEXT NOT NULL DEFAULT 'menunggu',
      dcv_dibuat_pada     TEXT NOT NULL,
      dcv_terbukti_pada   TEXT,
      dcv_diperiksa_pada  TEXT
    );
  `);

  return db;
}
