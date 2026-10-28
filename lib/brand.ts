/**
 * Konstanta brand Ruang Konsul Solo.
 * Import dari sini — jangan hardcode string brand di halaman individual.
 */
export const BRAND = {
  name:             "Ruang Konsul Solo",
  shortName:        "RK Solo",
  tagline:          "Konsultasi & Bimbingan Skripsi/Tesis (S1 & S2)",
  taglineShort:     "Bimbingan Akademik Terpercaya",
  domain:           "ruangkonsulsolo.id",

  // ── Kontak ─────────────────────────────────────────────────────────
  email:            "ruangkonsulsolo@gmail.com",
  whatsapp:         "62882007483223",           // format internasional tanpa +
  whatsappDisplay:  "0882007483223",
  instagram:        "@ruangkonsull_solo",
  instagramUrl:     "https://instagram.com/ruangkonsull_solo",
  tiktok:           "@ruangkonsull_solo",
  tiktokUrl:        "https://tiktok.com/@ruangkonsull_solo",
  address:          "Jl. Sibela Barat No 21, Mojosongo, Jebres, Surakarta",
  mapsUrl:          "https://share.google/Y1tiLRZXC9vGQ1vfK",

  // ── Aset ───────────────────────────────────────────────────────────
  logoPng:          "/logo-rks.png",            // logo utama (PNG dari aset)
  logoSvg:          "/logo-rks.svg",            // fallback SVG
  iconInstagram:    "/icon-instagram.webp",
  iconWhatsapp:     "/icon-whatsapp.webp",
  iconTiktok:       "/icon-tiktok.avif",

  // ── Misc ───────────────────────────────────────────────────────────
  primaryColor:     "#8B0000",
  year:             "2026",
} as const;

/** Link WA dengan pesan pre-filled */
export function waLink(message = "") {
  const encoded = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${BRAND.whatsapp}${encoded}`;
}
