import type { Metadata } from "next";
import { Literata, Archivo } from "next/font/google";
import "./globals.css";
import { BRAND } from "@/lib/brand";

/**
 * Literata — serif untuk membaca panjang. Judul dan paragraf editorial.
 * Dipakai lewat variabel CSS, bukan className, supaya Tailwind yang
 * memutuskan di mana serif muncul dan di mana sans.
 */
const literata = Literata({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-literata",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

/** Archivo — grotesk untuk semua teks fungsional: nav, tombol, tabel, kalender. */
const archivo = Archivo({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-archivo",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: `${BRAND.name} — ${BRAND.taglineShort}`,
    template: `%s | ${BRAND.name}`,
  },
  description:
    "Bimbingan skripsi, tesis dan disertasi bersama mentor berpengalaman. " +
    "Pilih mentor, pesan jadwal, dan kerjakan tulisanmu sendiri dengan arahan " +
    "yang jelas. Melayani Solo, Jogja, Jakarta dan Bekasi.",
  metadataBase: new URL(`https://${BRAND.domain}`),
  keywords: [
    "bimbingan skripsi solo",
    "bimbingan tesis jogja",
    "mentor skripsi",
    "konsultasi akademik",
    "ruang konsul solo",
    "bimbingan metodologi penelitian",
  ],
  openGraph: {
    title: BRAND.name,
    description: BRAND.tagline,
    url: `https://${BRAND.domain}`,
    siteName: BRAND.name,
    locale: "id_ID",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${literata.variable} ${archivo.variable}`}>
      <body>{children}</body>
    </html>
  );
}
