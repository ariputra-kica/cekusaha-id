import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "cekusaha.id",
  description:
    "Verifikasi kepercayaan untuk usaha berbasis domain .id dan identitas e.id.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={jakarta.variable}>
      <body>
        <header className="siteHeader">
          <div className="bar">
            <Link href="/" className="wordmark">
              cekusaha<span className="tld">.id</span>
            </Link>
            <span className="tagline">Verifikasi domain dan identitas</span>
          </div>
        </header>

        <main className="page">{children}</main>

        <footer className="siteFooter">
          <div className="bar">
            cekusaha.id — dibangun untuk .id Vibe Coding 2026
          </div>
        </footer>
      </body>
    </html>
  );
}
