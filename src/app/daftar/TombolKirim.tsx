"use client";

/**
 * Tombol kirim yang menunjukkan dirinya sedang bekerja.
 *
 * useFormStatus berasal dari react-dom — bawaan React, bukan paket baru.
 * Komponen ini harus berada DI DALAM <form>, bukan yang merender form-nya,
 * supaya statusnya terbaca.
 */

import { useFormStatus } from "react-dom";

export default function TombolKirim({
  label,
  labelSedang,
}: {
  label: string;
  labelSedang: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="tombol"
      disabled={pending}
      aria-busy={pending}
    >
      {pending && <span className="putar" aria-hidden="true" />}
      {pending ? labelSedang : label}
    </button>
  );
}
