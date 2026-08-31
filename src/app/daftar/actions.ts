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
  // Hasilnya disimpan ke basis data, jadi halaman membacanya dari sana —
  // tidak perlu dititipkan lewat alamat URL.
  await periksaDcv(domain);
  redirect(`/daftar?domain=${encodeURIComponent(domain)}`);
}
