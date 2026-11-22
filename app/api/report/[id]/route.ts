import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { tokenPesananValid } from "@/lib/periksa/tautan-aman";

/** Kirim ke signed URL laporan (bucket reports privat, berlaku 1 jam). */
async function arahkanKeLaporan(path: string) {
  const { data, error } = await createAdminClient().storage.from("reports").createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return NextResponse.json({ error: "Gagal membuat link download." }, { status: 500 });
  return NextResponse.redirect(data.signedUrl);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Tautan WhatsApp bertoken: unduh tanpa sesi (tamu di perangkat lain).
  const t = request.nextUrl.searchParams.get("t");
  if (/^[0-9a-f-]{36}$/i.test(params.id) && tokenPesananValid(params.id, t)) {
    const { data: o } = await createAdminClient()
      .from("orders").select("status, report_storage_path").eq("id", params.id).maybeSingle();
    if (!o || o.status !== "selesai" || !o.report_storage_path) {
      return NextResponse.json({ error: "Laporan belum tersedia." }, { status: 404 });
    }
    return arahkanKeLaporan(o.report_storage_path);
  }

  const supabase = createClient({ tamu: true });
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

  const isAdmin = profile?.role === "admin" || profile?.role === "superadmin";

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
  // Kepemilikan sudah dicek di atas; tanda tangan URL memakai service role
  // karena bucket "reports" tidak bisa dibaca customer secara langsung.
  const { data: signedData, error: signedError } = await createAdminClient().storage
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
