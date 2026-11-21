/** Di atas ini dihitung "di atas 100 halaman" (±250 kata/halaman). */
export const BATAS_KATA_BESAR = 25_000;

export const SLUG_MANUAL = { kecil: "plagiasi-manual", besar: "plagiasi-manual-besar", drillbit: "drillbit-manual" } as const;

/** Jenis laporan manual yang bisa dipesan customer. */
export const JENIS_MANUAL = ["turnitin", "drillbit"] as const;
export type JenisManual = (typeof JENIS_MANUAL)[number];

/** Pilihan nama mesin pemeriksa untuk laporan manual (diisi admin). */
export const MESIN_LAPORAN = ["Turnitin", "DrillBit", "iThenticate", "Copyleaks", "Lainnya"] as const;

/** Semua slug layanan laporan manual (dipisah dari pesanan lain di panel admin). */
export const SEMUA_SLUG_MANUAL = ["plagiasi-manual", "plagiasi-manual-besar", "drillbit-manual"] as const;

export const FORMAT_LAPORAN = {
  baru: "Tampilan baru",
  lama: "Tampilan lama",
} as const;
