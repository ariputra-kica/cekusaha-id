import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js 16 otomatis menyisipkan blok instruksi berbahasa Inggris ke
  // CLAUDE.md setiap kali `next dev` dijalankan. CLAUDE.md di proyek ini
  // ditulis tangan dan dibaca juri, jadi penyisipan itu dimatikan.
  agentRules: false,
};

export default nextConfig;
