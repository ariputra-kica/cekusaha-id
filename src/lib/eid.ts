/**
 * Verifikasi identitas lewat e.id Verifier API.
 *
 * HANYA DIJALANKAN DI SERVER. Kredensial tidak pernah sampai ke browser.
 *
 * ⚠️ ATURAN PALING KRITIS: begitu status APPROVED, hasilnya WAJIB langsung
 * diambil dan disimpan ke SQLite. Masa hidupnya hanya ~300 detik. Lewat
 * batas itu datanya hilang permanen dan pemilik harus memindai ulang.
 *
 * Penjenjangan dua tingkat dijalankan sebagai DUA sesi terpisah, karena
 * e.id menolak dua skema dalam satu Verification Schema
 * ("only single schema is currently supported". diuji 31 Agustus 2026).
 * Kedua hasil disatukan lewat holder_did yang sama.
 */

import { ambilDb } from "./db.ts";

export type Tingkat = "kontak" | "identitas";

/** Verification Schema milik kita di e.id. Bukan rahasia. */
export const SKEMA: Record<
  Tingkat,
  { id: string; label: string; minta: string[]; mintaManusia: string }
> = {
  kontak: {
    id: "179f9489-b6e9-4bfe-9db0-a674ebaeb943",
    label: "Kontak Terverifikasi",
    minta: ["email", "phone_number"],
    mintaManusia: "email dan nomor telepon Anda",
  },
  identitas: {
    id: "074f157d-a743-4647-a39c-358b66da454a",
    label: "Identitas Terverifikasi",
    minta: ["fullname", "verificator"],
    mintaManusia: "nama lengkap Anda dan nama lembaga yang memeriksanya",
  },
};

const BASE = () => process.env.EID_BASE_URL || "https://gateway.e.id";

/* ------------------------------------------------------------------ */
/* Token                                                               */
/* ------------------------------------------------------------------ */

let tokenTersimpan: { nilai: string; kedaluwarsa: number } | null = null;

async function ambilToken(): Promise<string> {
  if (tokenTersimpan && Date.now() < tokenTersimpan.kedaluwarsa) {
    return tokenTersimpan.nilai;
  }
  const r = await fetch(`${BASE()}/api/v1/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.EID_CLIENT_ID,
      client_secret: process.env.EID_CLIENT_SECRET,
    }),
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
  const j: any = await r.json().catch(() => ({}));
  const token = j?.data?.token;
  if (!token) throw new Error(`gagal mengambil token e.id: ${j?.message || r.status}`);
  // Pakai ulang selama 50 menit; masa hidup sebenarnya 60 menit.
  tokenTersimpan = { nilai: token, kedaluwarsa: Date.now() + 50 * 60 * 1000 };
  return token;
}

async function panggil(path: string, opsi: RequestInit = {}) {
  const token = await ambilToken();
  const r = await fetch(BASE() + path, {
    ...opsi,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(opsi.headers || {}),
    },
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
  return { kode: r.status, data: (await r.json().catch(() => ({}))) as any };
}

/* ------------------------------------------------------------------ */
/* Bentuk data                                                         */
/* ------------------------------------------------------------------ */

export type Identitas = {
  domain: string;
  tingkat: Tingkat;
  holderDid: string;          // INTERNAL
  email: string | null;
  phoneNumber: string | null;
  fullname: string | null;
  verificator: string | null;
  dibuatPada: string;
};

export type Sesi = {
  sessionId: string;
  domain: string;
  tingkat: Tingkat;
  walletUrl: string | null;
  expiresAt: string | null;
  status: string;
  alasanTolak: string | null;
  diperiksaPada: string | null;
};

export type HasilPeriksa = {
  sesi: Sesi;
  selesai: boolean;
  kode:
    | "menunggu-pindai"
    | "menunggu-persetujuan"
    | "tersimpan"
    | "ditolak"
    | "kedaluwarsa"
    | "hilang"
    | "orang-berbeda"
    | "galat";
  pesan: string;
};

function barisKeSesi(r: any): Sesi {
  return {
    sessionId: r.session_id,
    domain: r.domain,
    tingkat: r.tingkat,
    walletUrl: r.wallet_url ?? null,
    expiresAt: r.expires_at ?? null,
    status: r.status,
    alasanTolak: r.alasan_tolak ?? null,
    diperiksaPada: r.diperiksa_pada ?? null,
  };
}

function barisKeIdentitas(r: any): Identitas {
  return {
    domain: r.domain,
    tingkat: r.tingkat,
    holderDid: r.holder_did,
    email: r.email ?? null,
    phoneNumber: r.phone_number ?? null,
    fullname: r.fullname ?? null,
    verificator: r.verificator ?? null,
    dibuatPada: r.dibuat_pada,
  };
}

/* ------------------------------------------------------------------ */
/* Membaca keadaan                                                     */
/* ------------------------------------------------------------------ */

export function bacaIdentitas(domain: string, tingkat: Tingkat): Identitas | null {
  const r: any = ambilDb()
    .prepare("SELECT * FROM identitas WHERE domain = ? AND tingkat = ?")
    .get(domain, tingkat);
  return r ? barisKeIdentitas(r) : null;
}

export function bacaSemuaIdentitas(domain: string): Identitas[] {
  return ambilDb()
    .prepare("SELECT * FROM identitas WHERE domain = ? ORDER BY tingkat")
    .all(domain)
    .map(barisKeIdentitas);
}

/** Sesi terbaru yang belum selesai untuk satu domain dan tingkat. */
export function bacaSesiAktif(domain: string, tingkat: Tingkat): Sesi | null {
  const r: any = ambilDb()
    .prepare(
      `SELECT * FROM sesi_eid
        WHERE domain = ? AND tingkat = ?
          AND status NOT IN ('APPROVED','REJECTED','EXPIRED','CANCELED')
        ORDER BY dibuat_pada DESC LIMIT 1`,
    )
    .get(domain, tingkat);
  return r ? barisKeSesi(r) : null;
}

export function bacaSesi(sessionId: string): Sesi | null {
  const r: any = ambilDb()
    .prepare("SELECT * FROM sesi_eid WHERE session_id = ?")
    .get(sessionId);
  return r ? barisKeSesi(r) : null;
}

/* ------------------------------------------------------------------ */
/* Membuat sesi                                                        */
/* ------------------------------------------------------------------ */

export async function mulaiSesi(domain: string, tingkat: Tingkat): Promise<Sesi> {
  const adaSesi = bacaSesiAktif(domain, tingkat);
  if (adaSesi) return adaSesi;

  const { kode, data } = await panggil("/api/v1/verifier/presentation/request", {
    method: "POST",
    body: JSON.stringify({
      verifier_doc_schema_id: SKEMA[tingkat].id,
      expires_in: 15,
    }),
  });

  const d = data?.data;
  if (!d?.session_id) {
    throw new Error(`gagal membuat sesi e.id (HTTP ${kode}): ${data?.message}`);
  }

  const sekarang = new Date().toISOString();
  ambilDb()
    .prepare(
      `INSERT INTO sesi_eid
         (session_id, domain, tingkat, wallet_url, expires_at, status, dibuat_pada)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(d.session_id, domain, tingkat, d.eid_oauth_url ?? null, d.expires_at ?? null, d.status ?? "PENDING", sekarang);

  return {
    sessionId: d.session_id,
    domain,
    tingkat,
    walletUrl: d.eid_oauth_url ?? null,
    expiresAt: d.expires_at ?? null,
    status: d.status ?? "PENDING",
    alasanTolak: null,
    diperiksaPada: null,
  };
}

/**
 * Apakah holder_did ini cocok dengan tingkat lain yang sudah terdaftar
 * untuk domain yang sama?
 *
 * Dua tingkat verifikasi hanya boleh disatukan kalau berasal dari dompet
 * e.id yang sama. Kalau berbeda, itu bukan pemilik yang sama, dan
 * menggabungkannya berarti menerbitkan halaman yang menyatakan sesuatu
 * yang tidak benar.
 *
 * Dipisah jadi fungsi tersendiri supaya bisa diuji tanpa dompet kedua.
 */
export function dompetSama(
  domain: string,
  tingkat: Tingkat,
  holderDid: string,
): boolean {
  const lain = bacaSemuaIdentitas(domain).filter((i) => i.tingkat !== tingkat);
  return !lain.some((i) => i.holderDid !== holderDid);
}

/* ------------------------------------------------------------------ */
/* Memeriksa dan menyimpan hasil                                       */
/* ------------------------------------------------------------------ */

function simpanStatus(sessionId: string, status: string, alasan: string | null) {
  ambilDb()
    .prepare(
      "UPDATE sesi_eid SET status = ?, alasan_tolak = ?, diperiksa_pada = ? WHERE session_id = ?",
    )
    .run(status, alasan, new Date().toISOString(), sessionId);
}

/**
 * Periksa satu sesi. Kalau APPROVED, hasilnya diambil dan disimpan SEKETIKA.
 * Tidak ada jeda antara mengetahui APPROVED dan menyimpan. 300 detik itu
 * pendek, dan kalau terlewat pemilik harus memindai ulang dari awal.
 */
export async function periksaSesi(sessionId: string): Promise<HasilPeriksa> {
  const sesi = bacaSesi(sessionId);
  if (!sesi) {
    return {
      sesi: { sessionId, domain: "", tingkat: "kontak", walletUrl: null, expiresAt: null, status: "?", alasanTolak: null, diperiksaPada: null },
      selesai: false,
      kode: "galat",
      pesan: "Sesi tidak ditemukan.",
    };
  }

  // Sudah tersimpan sebelumnya, tidak perlu diperiksa lagi.
  if (bacaIdentitas(sesi.domain, sesi.tingkat)) {
    return { sesi, selesai: true, kode: "tersimpan", pesan: "Verifikasi ini sudah tersimpan." };
  }

  let s: any;
  try {
    s = await panggil(`/api/v1/verifier/presentation/simple/${sessionId}`);
  } catch (err: any) {
    return { sesi, selesai: false, kode: "galat", pesan: `Tidak bisa menghubungi e.id: ${err?.message}` };
  }

  const status = s.data?.data?.status as string | undefined;
  const alasan = s.data?.data?.reject_reason ?? null;
  if (!status) {
    return { sesi, selesai: false, kode: "galat", pesan: `Jawaban e.id tidak terbaca (HTTP ${s.kode}).` };
  }
  simpanStatus(sessionId, status, alasan);
  const sesiBaru = bacaSesi(sessionId)!;

  if (status === "PENDING") {
    return { sesi: sesiBaru, selesai: false, kode: "menunggu-pindai", pesan: "Menunggu Anda membuka tautan di aplikasi e.id." };
  }
  if (status === "SCANNED" || status === "WAITING_APPROVAL") {
    return { sesi: sesiBaru, selesai: false, kode: "menunggu-persetujuan", pesan: "Sudah terbaca dompet Anda. Sekarang tekan setuju di ponsel." };
  }
  if (status === "REJECTED") {
    return { sesi: sesiBaru, selesai: true, kode: "ditolak", pesan: alasan ? `Anda menolak berbagi data: ${alasan}` : "Anda menolak berbagi data." };
  }
  if (status === "EXPIRED" || status === "CANCELED") {
    return { sesi: sesiBaru, selesai: true, kode: "kedaluwarsa", pesan: "Sesi ini sudah kedaluwarsa. Mulai lagi dari awal." };
  }

  if (status !== "APPROVED") {
    return { sesi: sesiBaru, selesai: false, kode: "galat", pesan: `Status tidak dikenal: ${status}` };
  }

  /* ---- APPROVED: AMBIL DAN SIMPAN SEKARANG JUGA ---- */

  const h = await panggil(`/api/v1/verifier/presentation/result/${sessionId}`);
  const d = h.data?.data;
  if (!d?.holder_did) {
    return {
      sesi: sesiBaru,
      selesai: true,
      kode: "hilang",
      pesan:
        "Persetujuan Anda diterima, tapi datanya sudah kedaluwarsa sebelum sempat diambil (batasnya 5 menit). Mohon ulangi.",
    };
  }

  // Penyatuan dua tingkat: harus dompet yang sama.
  if (!dompetSama(sesi.domain, sesi.tingkat, d.holder_did)) {
    return {
      sesi: sesiBaru,
      selesai: true,
      kode: "orang-berbeda",
      pesan:
        "Identitas ini berasal dari dompet e.id yang berbeda dengan yang sudah terdaftar untuk domain ini. Gunakan dompet yang sama.",
    };
  }

  const cs = d.presentation?.credentialSubject ?? {};
  ambilDb()
    .prepare(
      `INSERT OR REPLACE INTO identitas
        (domain, tingkat, holder_did, issuer, issuance_date, credential_id,
         credential_status, session_id, retrieved_at,
         email, phone_number, fullname, verificator, dibuat_pada)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .run(
      sesi.domain,
      sesi.tingkat,
      d.holder_did,
      d.presentation?.issuer ?? null,
      d.presentation?.issuanceDate ?? null,
      d.presentation?.id ?? null,
      d.presentation?.credentialStatus ? JSON.stringify(d.presentation.credentialStatus) : null,
      d.session_id ?? sessionId,
      d.retrieved_at ?? null,
      cs.email ?? null,
      cs.phone_number ?? null,
      cs.fullname ?? null,
      cs.verificator ?? null,
      new Date().toISOString(),
    );

  return {
    sesi: sesiBaru,
    selesai: true,
    kode: "tersimpan",
    pesan: `${SKEMA[sesi.tingkat].label} berhasil disimpan.`,
  };
}
