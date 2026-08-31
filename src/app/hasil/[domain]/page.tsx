export default async function HasilPemilik({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;

  return (
    <>
      <p className="eyebrow">Halaman pemilik — privat</p>
      <h1>{decodeURIComponent(domain)}</h1>
      <p className="lead">
        Hasil pendaftaran Anda: QR code untuk dicetak, tautan pendek s.id
        untuk bio media sosial, dan seal untuk dipasang di situs.
      </p>

      <p className="note">
        Kerangka halaman. QR, tautan pendek, dan seal belum dipasang.
      </p>
    </>
  );
}
