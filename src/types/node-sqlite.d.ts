/**
 * Deklarasi tipe seadanya untuk `node:sqlite`, modul bawaan Node.
 *
 * Paket @types/node yang terpasang belum memuat modul ini, sehingga
 * TypeScript menganggapnya tidak ada. Sesuai catatan di CLAUDE.md, tipe
 * dilonggarkan saja daripada menghabiskan waktu memuaskan compiler.
 */
declare module "node:sqlite" {
  export class DatabaseSync {
    constructor(path: string, options?: any);
    exec(sql: string): void;
    prepare(sql: string): {
      run(...params: any[]): any;
      get(...params: any[]): any;
      all(...params: any[]): any[];
    };
    close(): void;
  }
}
