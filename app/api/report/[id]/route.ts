import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser, STAFF_ROLES } from "@/lib/auth/roles";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireUser();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, role } = auth.ctx;
  const isAdmin = STAFF_ROLES.includes(role);

  // Signed URL dibuat dengan service role (bucket privat), setelah cek kepemilikan
  const supabase = createAdminClient();

  let query = supabase
    .from("orders")
    .select("id, user_id, status, report_storage_path")
    .eq("id", params.id);

  // Non-admin hanya bisa akses order milik sendiri
  if (!isAdmin) {
    query = query.eq("user_id", user.id);
  }

  const { data: order } = await query.single();

  if (!order) {
    return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
  }

  if (order.status !== "selesai") {
    return NextResponse.json(
      { error: "Laporan belum tersedia. Pesanan belum selesai." },
      { status: 400 }
    );
  }

  if (!order.report_storage_path) {
    return NextResponse.json(
      { error: "Laporan belum diupload oleh admin." },
      { status: 404 }
    );
  }

  // Generate signed URL (1 jam)
  const { data: signedData, error: signedError } = await supabase.storage
    .from("reports")
    .createSignedUrl(order.report_storage_path, 300, { download: true });

  if (signedError || !signedData?.signedUrl) {
    return NextResponse.json(
      { error: "Gagal membuat link download." },
      { status: 500 }
    );
  }

  return NextResponse.redirect(signedData.signedUrl);
}
