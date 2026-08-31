"use server";

import { redirect } from "next/navigation";
import { mulaiDcv, periksaDcv, normalisasiDomain, domainMasukAkal } from "@/lib/dcv";

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
  const hasil = await periksaDcv(domain);
  redirect(
    `/daftar?domain=${encodeURIComponent(domain)}&kode=${hasil.kode ?? ""}`,
  );
}
