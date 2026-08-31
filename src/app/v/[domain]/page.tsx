export default async function VerifikasiPublik({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;

  return (
    <>
      <p className="eyebrow">Halaman verifikasi publik</p>
      <h1>{decodeURIComponent(domain)}</h1>
      <p className="lead">
        Apa yang sudah dibuktikan tentang domain ini, dan apa yang belum.
        Dapat dibuka siapa saja tanpa akun.
      </p>

      <p className="note">
        Kerangka halaman. Tiga pilar bukti dan waktu pemeriksaan terakhir
        belum dipasang.
      </p>
    </>
  );
}
