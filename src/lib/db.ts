/**
 * Basis data SQLite. satu berkas di dalam proyek.
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
      dcv_diperiksa_pada  TEXT,
      -- Hasil pemeriksaan terakhir, supaya halaman bisa menunjukkan bahwa
      -- tombol "Cek ulang" benar-benar mengerjakan sesuatu.
      dcv_kode_terakhir   TEXT,
      dcv_txt_terbaca     TEXT
    );
  `);

  db.exec(`
    -- Sesi presentasi e.id yang sedang berjalan.
    CREATE TABLE IF NOT EXISTS sesi_eid (
      session_id     TEXT PRIMARY KEY,
      domain         TEXT NOT NULL,
      tingkat        TEXT NOT NULL,        -- 'kontak' | 'identitas'
      wallet_url     TEXT,
      expires_at     TEXT,
      status         TEXT NOT NULL,
      alasan_tolak   TEXT,
      dibuat_pada    TEXT NOT NULL,
      diperiksa_pada TEXT
    );

    -- Hasil verifikasi identitas yang sudah tersimpan.
    -- Pemisahan INTERNAL vs BOLEH TAMPIL mengikuti aturan di CLAUDE.md.
    CREATE TABLE IF NOT EXISTS identitas (
      domain            TEXT NOT NULL,
      tingkat           TEXT NOT NULL,

      -- INTERNAL, tidak pernah dirender di Halaman B
      holder_did        TEXT NOT NULL,
      issuer            TEXT,
      issuance_date     TEXT,
      credential_id     TEXT,
      credential_status TEXT,
      session_id        TEXT,
      retrieved_at      TEXT,

      -- BOLEH TAMPIL. dipilih sadar, bukan semua yang kebetulan ada
      email             TEXT,
      phone_number      TEXT,
      fullname          TEXT,
      verificator       TEXT,

      dibuat_pada       TEXT NOT NULL,
      PRIMARY KEY (domain, tingkat)
    );
  `);

  db.exec(`
    -- Salinan data dari sumber luar: RDAP dan sertifikat TLS.
    -- Disimpan sekali saat pendaftaran. Halaman B membaca dari sini,
    -- TIDAK pernah menembak sumbernya saat halaman dibuka.
    CREATE TABLE IF NOT EXISTS sumber_luar (
      domain               TEXT PRIMARY KEY,

      rdap_ok              INTEGER,
      rdap_registrasi      TEXT,
      rdap_kedaluwarsa     TEXT,
      rdap_registrar       TEXT,
      rdap_diperiksa       TEXT,
      rdap_galat           TEXT,

      ssl_ok               INTEGER,
      ssl_jenis            TEXT,   -- 'DV' | 'OV'
      ssl_organisasi       TEXT,
      ssl_penerbit         TEXT,
      ssl_penerbit_org     TEXT,
      ssl_berlaku_sampai   TEXT,
      ssl_tepercaya        INTEGER,
      ssl_diperiksa        TEXT,
      ssl_galat            TEXT
    );
  `);

  db.exec(`
    -- Aset siap pakai milik pemilik: tautan pendek s.id.
    -- Dibuat SEKALI saat pendaftaran lalu disimpan. Batas s.id 38
    -- permintaan per menit, jadi jangan pernah memanggil ulang tiap
    -- halaman dibuka.
    CREATE TABLE IF NOT EXISTS aset (
      domain      TEXT PRIMARY KEY,
      sid_url     TEXT,
      sid_slug    TEXT,
      sid_dibuat  TEXT,
      sid_galat   TEXT
    );
  `);

  // Tambahkan kolom baru pada basis data yang sudah terlanjur dibuat.
  for (const k of ["dcv_kode_terakhir", "dcv_txt_terbaca"]) {
    try {
      db.exec(`ALTER TABLE domain ADD COLUMN ${k} TEXT`);
    } catch {
      // sudah ada. abaikan
    }
  }

  return db;
}
