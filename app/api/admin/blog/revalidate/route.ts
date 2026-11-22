import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { wajibStaf } from "@/lib/auth/wajib-staf";

/** Perbarui cache halaman blog segera setelah admin menyimpan/terbitkan/hapus artikel. */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Masuk dulu." }, { status: 401 });
  const tolak = await wajibStaf(supabase, user.id);
  if (tolak) return tolak;

  const body = (await req.json().catch(() => ({}))) as { slug?: unknown };
  revalidatePath("/blog");
  if (typeof body.slug === "string" && /^[a-z0-9-]{1,120}$/.test(body.slug)) {
    revalidatePath(`/blog/${body.slug}`);
  }
  return NextResponse.json({ ok: true });
}
