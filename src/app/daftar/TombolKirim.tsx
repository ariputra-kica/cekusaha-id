"use client";

/**
 * Tombol kirim yang menunjukkan dirinya sedang bekerja.
 *
 * useFormStatus berasal dari react-dom, bawaan React, bukan paket baru.
 * Komponen ini harus berada DI DALAM <form>, bukan yang merender form-nya,
 * supaya statusnya terbaca.
 */

import { useFormStatus } from "react-dom";

export default function TombolKirim({
  label,
  labelSedang,
  gaya = "utama",
}: {
  label: string;
  labelSedang: string;
  /** "garis" untuk tawaran sampingan, supaya tidak bersaing dengan aksi utama. */
  gaya?: "utama" | "garis";
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={gaya === "garis" ? "tombol tombol--garis" : "tombol"}
      disabled={pending}
      aria-busy={pending}
    >
      {pending && <span className="putar" aria-hidden="true" />}
      {pending ? labelSedang : label}
    </button>
  );
}
