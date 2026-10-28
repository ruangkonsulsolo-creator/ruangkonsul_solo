import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { BRAND } from "@/lib/brand";

// Plus Jakarta Sans — mirip font Cekat.ai, modern dan bersih
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: `${BRAND.name} — ${BRAND.taglineShort}`,
    template: `%s | ${BRAND.name}`,
  },
  description:
    "Layanan bimbingan skripsi, tesis, cek plagiasi Turnitin, AI Detector, parafrase, dan jasa akademik terpercaya di Solo.",
  metadataBase: new URL(`https://${BRAND.domain}`),
  keywords: [
    "bimbingan skripsi solo", "bimbingan tesis",
    "cek plagiasi turnitin", "parafrase skripsi",
    "ruang konsul solo", "konsultasi akademik",
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={jakarta.variable}>
      <body className={`${jakarta.className} antialiased`}>{children}</body>
    </html>
  );
}
