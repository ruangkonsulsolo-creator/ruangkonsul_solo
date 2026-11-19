/** Aturan checkout produk katalog — dipakai server (API) dan UI. */

/** Ongkir flat untuk produk fisik. Ubah lewat NEXT_PUBLIC_ONGKIR_FLAT. */
export function ongkirFlat(): number {
  const v = Number(process.env.NEXT_PUBLIC_ONGKIR_FLAT ?? 15000);
  return Number.isFinite(v) && v >= 0 ? Math.round(v) : 15000;
}

/**
 * Produk bisa dibayar langsung jika harganya pasti (> 0 dan bukan "mulai dari").
 * Produk "mulai dari" tetap dikonfirmasi lewat WhatsApp karena harga akhirnya
 * bergantung pilihan isi.
 */
/** Paket bimbingan per jam harus pilih mentor + jadwal dulu sebelum bayar. */
export function perluPilihJadwal(p: { satuan: string | null }): boolean {
  return /\bper\s*jam\b/i.test(p.satuan ?? "");
}

export function bisaDibayarLangsung(p: { harga: number; harga_mulai: boolean }): boolean {
  return p.harga > 0 && !p.harga_mulai;
}
