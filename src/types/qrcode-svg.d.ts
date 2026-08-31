/**
 * Deklarasi tipe seadanya untuk qrcode-svg — paket itu tidak membawa
 * tipenya sendiri. Sesuai catatan di CLAUDE.md, tipe dilonggarkan saja
 * daripada menghabiskan waktu memuaskan compiler.
 */
declare module "qrcode-svg" {
  interface PilihanQR {
    content: string;
    padding?: number;
    width?: number;
    height?: number;
    color?: string;
    background?: string;
    ecl?: "L" | "M" | "Q" | "H";
    join?: boolean;
    container?: string;
    xmlDeclaration?: boolean;
  }
  export default class QRCode {
    constructor(pilihan: PilihanQR | string);
    svg(): string;
  }
}
