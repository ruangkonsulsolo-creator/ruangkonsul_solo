/**
 * Seberapa banyak naskah berubah setelah parafrase, 0–100.
 * Diukur dari pasangan kata berurutan (bigram) yang masih sama: 100 berarti
 * tidak ada satu pun pasangan kata asli yang tersisa.
 */
export function persenBerubah(asli: string, hasil: string): number {
  const bigram = (s: string) => {
    const w = s.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
    const m = new Map<string, number>();
    for (let i = 0; i < w.length - 1; i++) {
      const k = `${w[i]} ${w[i + 1]}`;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  };
  const a = bigram(asli);
  const b = bigram(hasil);
  let total = 0;
  let sama = 0;
  for (const [k, n] of a) {
    total += n;
    sama += Math.min(n, b.get(k) ?? 0);
  }
  if (total === 0) return 0;
  return Math.max(0, Math.min(100, Math.round((1 - sama / total) * 100)));
}

/** Label tingkat untuk skor AI (0–100). */
export function labelAi(skor: number): string {
  if (skor >= 80) return "Sangat mungkin dihasilkan AI";
  if (skor >= 60) return "Kemungkinan besar dihasilkan AI";
  if (skor >= 40) return "Campuran tulisan manusia & AI";
  if (skor >= 20) return "Sebagian kecil terindikasi AI";
  return "Kemungkinan besar tulisan manusia";
}

/** Label tingkat untuk persentase kemiripan. */
export function labelKemiripan(persen: number): string {
  if (persen <= 10) return "Similarity rendah — Bagus!";
  if (persen <= 20) return "Similarity aman — umumnya lolos batas kampus";
  if (persen <= 30) return "Similarity sedang — periksa bagian yang ditandai";
  return "Similarity tinggi — perlu parafrase & sitasi";
}
