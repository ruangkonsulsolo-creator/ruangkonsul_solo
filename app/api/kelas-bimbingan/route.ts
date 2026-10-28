import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("kelas_bimbingan")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error || !data) {
      return NextResponse.json({ data: [] });
    }

    return NextResponse.json({ data });
  } catch {
    // DB belum siap — return empty agar frontend pakai fallback static
    return NextResponse.json({ data: [] });
  }
}
