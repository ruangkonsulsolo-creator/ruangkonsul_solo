import "server-only";
import type { PaketPromo } from "./paket-promo-data";

/** Paket promo aktif untuk beranda. Kosong bila tabel (migration 041) belum ada. */
export async function ambilPaketPromo(): Promise<PaketPromo[]> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const { data, error } = await createClient()
      .from("paket_promo")
      .select("id, judul, harga_mulai, satuan, kategori, image_url, fitur, cta_label, cta_href")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(12);
    if (error) return [];
    return (data ?? []) as PaketPromo[];
  } catch (e) {
    // Biarkan Next menandai halaman sebagai dinamis (pemakaian cookies).
    if ((e as { digest?: string })?.digest === "DYNAMIC_SERVER_USAGE") throw e;
    return [];
  }
}
