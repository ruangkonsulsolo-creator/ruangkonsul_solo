import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Tolak lebih awal bila pemanggil bukan admin/superadmin. RLS tetap lapis
 * utama, tapi tanpa cek ini DELETE oleh non-staf "berhasil" dengan 0 baris
 * dan mengembalikan ok:true yang menyesatkan.
 */
export async function wajibStaf(supabase: SupabaseClient<any, any, any>, userId: string): Promise<NextResponse | null> {
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (!data || !["admin", "superadmin"].includes(data.role)) {
    return NextResponse.json({ error: "Akses ditolak. Khusus admin." }, { status: 403 });
  }
  return null;
}
