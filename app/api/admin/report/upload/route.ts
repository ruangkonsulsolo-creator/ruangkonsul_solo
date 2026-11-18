import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser, STAFF_ROLES } from "@/lib/auth/roles";

export async function POST(request: NextRequest) {
  const auth = await requireUser(STAFF_ROLES);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // Storage bucket "reports" tidak punya policy tulis untuk user → pakai service role
  const supabase = createAdminClient();

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Gagal membaca request." }, { status: 400 });
  }

  const orderId = formData.get("order_id") as string | null;
  const report = formData.get("report") as File | null;

  if (!orderId || !report) {
    return NextResponse.json({ error: "order_id dan report wajib diisi." }, { status: 400 });
  }

  if (report.type !== "application/pdf") {
    return NextResponse.json({ error: "Laporan harus berformat PDF." }, { status: 415 });
  }

  if (report.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "Ukuran laporan melebihi 20 MB." }, { status: 413 });
  }

  // Verifikasi order ada
  const { data: order } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .single();

  if (!order) {
    return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
  }

  const storagePath = `${orderId}/laporan.pdf`;
  const arrayBuffer = await report.arrayBuffer();

  // Upload ke bucket "reports" (upsert: timpa jika sudah ada)
  const { error: uploadError } = await supabase.storage
    .from("reports")
    .upload(storagePath, arrayBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    console.error("Report upload error:", uploadError);
    return NextResponse.json({ error: "Gagal mengunggah laporan." }, { status: 500 });
  }

  // Update order dengan path laporan
  await supabase
    .from("orders")
    .update({
      report_storage_path: storagePath,
      report_uploaded_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  return NextResponse.json({ data: { storage_path: storagePath } });
}
