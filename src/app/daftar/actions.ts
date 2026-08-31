"use server";

import { redirect } from "next/navigation";
import { mulaiDcv, periksaDcv, normalisasiDomain, domainMasukAkal } from "@/lib/dcv";
import { mulaiSesi, periksaSesi, type Tingkat } from "@/lib/eid";

export async function aksiMulai(formData: FormData) {
  const domain = normalisasiDomain(String(formData.get("domain") || ""));
  if (!domain || !domainMasukAkal(domain)) {
    redirect(`/daftar?galat=domain-tidak-sah`);
  }
  mulaiDcv(domain);
  redirect(`/daftar?domain=${encodeURIComponent(domain)}`);
}

export async function aksiCekUlang(formData: FormData) {
  const domain = normalisasiDomain(String(formData.get("domain") || ""));
  await periksaDcv(domain);
  redirect(`/daftar?domain=${encodeURIComponent(domain)}`);
}

/** Mulai satu sesi presentasi e.id untuk tingkat tertentu. */
export async function aksiMulaiEid(formData: FormData) {
  const domain = normalisasiDomain(String(formData.get("domain") || ""));
  const tingkat = String(formData.get("tingkat") || "kontak") as Tingkat;
  let kode = "";
  try {
    await mulaiSesi(domain, tingkat);
  } catch {
    kode = "&eid=gagal-mulai";
  }
  redirect(`/daftar?domain=${encodeURIComponent(domain)}${kode}`);
}

/**
 * Periksa sesi. Kalau sudah disetujui, hasilnya langsung tersimpan di
 * dalam periksaSesi() — tidak ada jeda, karena batasnya 300 detik.
 */
export async function aksiPeriksaEid(formData: FormData) {
  const domain = normalisasiDomain(String(formData.get("domain") || ""));
  const sessionId = String(formData.get("sessionId") || "");
  const h = await periksaSesi(sessionId);
  redirect(`/daftar?domain=${encodeURIComponent(domain)}&eid=${h.kode}`);
}
