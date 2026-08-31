"use client";

/** Tombol salin ke papan klip. Tanpa pustaka; memakai API bawaan peramban. */

import { useState } from "react";

export default function TombolSalin({ teks }: { teks: string }) {
  const [tersalin, setTersalin] = useState(false);

  return (
    <button
      type="button"
      className="tombolSalin"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(teks);
          setTersalin(true);
          setTimeout(() => setTersalin(false), 2000);
        } catch {
          // Peramban menolak akses papan klip — pengguna masih bisa
          // menyorot dan menyalin sendiri.
        }
      }}
    >
      {tersalin ? "Tersalin" : "Salin"}
    </button>
  );
}
