"use server";

import { redirect } from "next/navigation";
import { normalisasiDomain, domainMasukAkal } from "@/lib/dcv";

/**
 * Reverse lookup dari halaman depan.
 *
 * Tidak menyentuh jaringan sama sekali, hanya merapikan masukan lalu
 * mengarahkan ke halaman verifikasi domain itu. Halaman tujuan membaca
 * dari salinan tersimpan.
 */
export async function aksiPeriksaDomain(formData: FormData) {
  const domain = normalisasiDomain(String(formData.get("domain") || ""));

  if (!domain || !domainMasukAkal(domain)) {
    redirect(`/?galat=domain-tidak-sah`);
  }

  redirect(`/v/${encodeURIComponent(domain)}`);
}
