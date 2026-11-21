import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { TARIF, type JenisPeriksa } from "@/lib/periksa/types";
import { SLUG_MANUAL } from "@/lib/periksa/manual";

/** Slug layanan di tabel services untuk tiap jenis periksa (lihat migration 024/035). */
export const SLUG_PERIKSA: Record<JenisPeriksa, string> = {
  kemiripan: "cek-plagiarisme",
  ai: "cek-ai",
  parafrase: "parafrase",
};

export type TarifPeriksa = Record<JenisPeriksa, number>;
export type TarifManual = { kecil: number; besar: number; aktif: boolean };
export type StatusPeriksa = { tarif: TarifPeriksa; aktif: Record<JenisPeriksa, boolean>; manual: TarifManual };

/**
 * Tarif per 1.000 kata dari Admin > Tarif Pemeriksaan (tabel services).
 * Jika tabel belum terisi / tidak terbaca, pakai TARIF bawaan di kode supaya
 * pemeriksaan tetap jalan dengan harga yang wajar.
 */
export async function ambilTarifPeriksa(): Promise<StatusPeriksa> {
  // Jangan ikut cache halaman (beranda revalidate 300 dtk): harga yang diubah
  // admin harus langsung tampil, sama dengan yang ditagihkan /api/periksa.
  noStore();
  const tarif: TarifPeriksa = { ...TARIF };
  const aktif: Record<JenisPeriksa, boolean> = { kemiripan: true, ai: true, parafrase: true };
  // Mode manual baru aktif bila migration 042 sudah menambah layanannya.
  const manual: TarifManual = { kecil: 15000, besar: 20000, aktif: false };
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return { tarif, aktif, manual };
    const { data } = await createAdminClient()
      .from("services")
      .select("slug, price_idr, is_active")
      .in("slug", [...Object.values(SLUG_PERIKSA), SLUG_MANUAL.kecil, SLUG_MANUAL.besar]);
    for (const jenis of Object.keys(SLUG_PERIKSA) as JenisPeriksa[]) {
      const row = data?.find((r) => r.slug === SLUG_PERIKSA[jenis]);
      if (!row) continue;
      if (Number.isFinite(row.price_idr) && row.price_idr > 0) tarif[jenis] = row.price_idr;
      aktif[jenis] = row.is_active !== false;
    }
    const kecil = data?.find((r) => r.slug === SLUG_MANUAL.kecil);
    const besar = data?.find((r) => r.slug === SLUG_MANUAL.besar);
    if (kecil) {
      manual.kecil = kecil.price_idr;
      manual.besar = besar?.price_idr ?? kecil.price_idr;
      manual.aktif = kecil.is_active !== false;
    }
  } catch (err) {
    console.warn("[periksa] tarif dari DB gagal dibaca, pakai bawaan:", err);
  }
  return { tarif, aktif, manual };
}
