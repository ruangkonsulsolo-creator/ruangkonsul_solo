import { NextRequest, NextResponse } from "next/server";
import { requireUser, STAFF_ROLES } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Unduh file hasil (mis. .docx parafrase) via signed URL 5 menit. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = createAdminClient();
  let q = admin.from("orders").select("id, user_id, status, output_storage_path").eq("id", params.id);
  if (!STAFF_ROLES.includes(auth.ctx.role)) q = q.eq("user_id", auth.ctx.user.id);
  const { data: order } = await q.maybeSingle();

  if (!order?.output_storage_path || order.status !== "selesai") {
    return NextResponse.json({ error: "File hasil belum tersedia." }, { status: 404 });
  }
  const { data, error } = await admin.storage.from("reports").createSignedUrl(order.output_storage_path, 300, { download: true });
  if (error || !data) return NextResponse.json({ error: "Gagal membuat link unduhan." }, { status: 500 });
  return NextResponse.redirect(data.signedUrl);
}
