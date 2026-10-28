import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createClient();
    const now = new Date().toISOString();
    const { data } = await supabase
      .from("banners")
      .select("id, title, image_url, link_url, sort_order")
      .eq("is_active", true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order("sort_order", { ascending: true });

    return NextResponse.json({ data: data ?? [] });
  } catch {
    return NextResponse.json({ data: [] });
  }
}
