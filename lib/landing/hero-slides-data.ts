export type HeroSlide = {
  id: string;
  image_url: string;
  alt: string | null;
  badge: string | null;
  hook: string | null;
  cta_label: string | null;
  cta_href: string | null;
};

/** Dipakai bila tabel hero_slides belum ada (migration 040) atau kosong. */
export const SLIDE_BAWAAN: HeroSlide[] = [
  { id: "bawaan-1", image_url: "/promo-bimbingan.jpeg", alt: "Kelas Bimbingan Private", badge: "🎓 Bimbingan Private", hook: "Sampai ACC Sidang!", cta_label: "Daftar Sekarang", cta_href: "/jadwal" },
  { id: "bawaan-2", image_url: "/promo-bundling.jpeg", alt: "Paket Bundling Hemat", badge: "💰 Paket Bundling", hook: "Hemat Lebih Banyak!", cta_label: "Lihat Paket", cta_href: "/paket-hemat" },
  { id: "bawaan-3", image_url: "/promo-konsultasi.jpeg", alt: "Konsultasi Skripsi", badge: "💬 Konsultasi Akademik", hook: "Konsultasi Langsung!", cta_label: "Mulai Konsultasi", cta_href: "/jadwal" },
];
