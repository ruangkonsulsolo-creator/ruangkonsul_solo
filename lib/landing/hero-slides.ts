import "server-only";
import { SLIDE_BAWAAN, type HeroSlide } from "./hero-slides-data";

export type { HeroSlide };

export async function ambilHeroSlides(): Promise<HeroSlide[]> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const { data, error } = await createClient()
      .from("hero_slides")
      .select("id, image_url, alt, badge, hook, cta_label, cta_href")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(10);
    if (error || !data || data.length === 0) return SLIDE_BAWAAN;
    return data as HeroSlide[];
  } catch {
    return SLIDE_BAWAAN;
  }
}
