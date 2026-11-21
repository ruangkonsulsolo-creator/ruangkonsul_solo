/** Di atas ini dihitung "di atas 100 halaman" (±250 kata/halaman). */
export const BATAS_KATA_BESAR = 25_000;

export const SLUG_MANUAL = { kecil: "plagiasi-manual", besar: "plagiasi-manual-besar" } as const;

/** Pilihan nama mesin pemeriksa untuk laporan manual (diisi admin). */
export const MESIN_LAPORAN = ["Turnitin", "iThenticate", "Copyleaks", "Lainnya"] as const;

export const FORMAT_LAPORAN = {
  baru: "Tampilan baru",
  lama: "Tampilan lama",
} as const;
