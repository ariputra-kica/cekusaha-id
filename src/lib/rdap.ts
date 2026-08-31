/**
 * Pembacaan data domain lewat RDAP PANDI.
 *
 * HANYA DIJALANKAN DI SERVER. Tidak pernah dipanggil dari browser.
 *
 * Catatan penting: RDAP meredaksi seluruh data registrant. Itu praktik
 * standar pasca-GDPR, bukan kekeliruan. Jangan mencari jalan lain untuk
 * mendapatkannya. `registrar` adalah penyedia jasa pendaftaran, BUKAN
 * pemilik domain.
 */

const RDAP_BASE = "https://rdap.pandi.id/rdap/domain";

export type HasilRdap = {
  ok: boolean;
  domain: string;
  galat?: string;

  tanggalRegistrasi: string | null;
  tanggalKedaluwarsa: string | null;
  terakhirDiubah: string | null;
  namaRegistrar: string | null;
  idRegistrar: string | null;
  status: string[];
  dnssec: boolean | null;

  diperiksaPada: string;
};

/** Ambil satu eventDate berdasarkan nama aksinya. */
function cariTanggal(events: any[], aksi: string): string | null {
  if (!Array.isArray(events)) return null;
  const e = events.find(
    (x) => String(x?.eventAction || "").toLowerCase() === aksi,
  );
  return e?.eventDate ?? null;
}

/** Ambil nama tampilan (fn) dari struktur vCard milik sebuah entity. */
function namaDariVcard(entity: any): string | null {
  const arr = entity?.vcardArray;
  if (!Array.isArray(arr) || !Array.isArray(arr[1])) return null;
  const fn = arr[1].find((f: any) => Array.isArray(f) && f[0] === "fn");
  return fn?.[3] ?? null;
}

export async function ambilRdap(domain: string): Promise<HasilRdap> {
  const kosong: HasilRdap = {
    ok: false,
    domain,
    tanggalRegistrasi: null,
    tanggalKedaluwarsa: null,
    terakhirDiubah: null,
    namaRegistrar: null,
    idRegistrar: null,
    status: [],
    dnssec: null,
    diperiksaPada: new Date().toISOString(),
  };

  try {
    const res = await fetch(`${RDAP_BASE}/${encodeURIComponent(domain)}`, {
      headers: { Accept: "application/rdap+json" },
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });

    if (!res.ok) {
      return { ...kosong, galat: `RDAP menjawab HTTP ${res.status}` };
    }

    const data: any = await res.json();

    const registrar = (data.entities || []).find((e: any) =>
      (e?.roles || []).includes("registrar"),
    );

    const idReg =
      (registrar?.publicIds || []).find((p: any) =>
        String(p?.type || "").toLowerCase().includes("registrar id"),
      )?.identifier ?? null;

    return {
      ok: true,
      domain: data.ldhName || domain,
      tanggalRegistrasi: cariTanggal(data.events, "registration"),
      tanggalKedaluwarsa: cariTanggal(data.events, "expiration"),
      terakhirDiubah: cariTanggal(data.events, "last changed"),
      namaRegistrar: registrar ? namaDariVcard(registrar) : null,
      idRegistrar: idReg,
      status: Array.isArray(data.status) ? data.status : [],
      dnssec:
        typeof data?.secureDNS?.delegationSigned === "boolean"
          ? data.secureDNS.delegationSigned
          : null,
      diperiksaPada: new Date().toISOString(),
    };
  } catch (err: any) {
    return { ...kosong, galat: err?.message || String(err) };
  }
}
