import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  // Cek kepemilikan order (user biasa atau admin)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";

  const query = supabase
    .from("orders")
    .select("id, user_id, status, report_storage_path")
    .eq("id", params.id);

  // Non-admin hanya bisa akses order milik sendiri
  if (!isAdmin) {
    query.eq("user_id", user.id);
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
    .createSignedUrl(order.report_storage_path, 3600);

  if (signedError || !signedData?.signedUrl) {
    return NextResponse.json(
      { error: "Gagal membuat link download." },
      { status: 500 }
    );
  }

  return NextResponse.redirect(signedData.signedUrl);
}
