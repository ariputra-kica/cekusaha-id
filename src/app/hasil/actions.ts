"use server";

import { redirect } from "next/navigation";
import { normalisasiDomain } from "@/lib/dcv";
import { pastikanTautanPendek } from "@/lib/sid";

/** Buat tautan pendek s.id kalau belum ada. Dipanggil sekali, atas
 *  permintaan pemilik — bukan otomatis tiap halaman dibuka. */
export async function aksiBuatTautanPendek(formData: FormData) {
  const domain = normalisasiDomain(String(formData.get("domain") || ""));
  await pastikanTautanPendek(domain);
  redirect(`/hasil/${encodeURIComponent(domain)}`);
}
