import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

/**
 * Manifest PWA: situs bisa "dipasang" ke layar utama HP (Tambahkan ke Layar
 * Utama) dan terbuka seperti aplikasi, tanpa toko aplikasi. Sengaja tanpa
 * service worker/cache offline: halaman pembayaran dan status pesanan harus
 * selalu data terbaru.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND.name,
    short_name: "Ruang Konsul",
    description: BRAND.tagline,
    lang: "id",
    start_url: "/?sumber=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#8B0000",
    categories: ["education", "productivity"],
    icons: [
      { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Cek Naskah", short_name: "Cek", url: "/#periksa", icons: [{ src: "/pwa/icon-192.png", sizes: "192x192" }] },
      { name: "Riwayat Pesanan", short_name: "Riwayat", url: "/dashboard/riwayat-pesanan", icons: [{ src: "/pwa/icon-192.png", sizes: "192x192" }] },
      { name: "Pesan Bimbingan", short_name: "Bimbingan", url: "/booking", icons: [{ src: "/pwa/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
