import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser, STAFF_ROLES } from "@/lib/auth/roles";
import { updateOrderStatusSchema } from "@/lib/validators/admin.schema";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireUser(STAFF_ROLES);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user } = auth.ctx;

  // Tulis via service role: notifikasi ke user lain tidak punya policy INSERT
  const supabase = createAdminClient();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const parsed = updateOrderStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Input tidak valid." },
      { status: 422 }
    );
  }

  const input = parsed.data;

  // Ambil order yang ada
  const { data: order } = await supabase
    .from("orders")
    .select("id, status, user_id, order_number, services(name)")
    .eq("id", params.id)
    .single();

  if (!order) {
    return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
  }

  const now = new Date().toISOString();

  const updatePayload: Record<string, unknown> = {
    status: input.status,
    assigned_admin_id: user.id,
  };

  if ("admin_notes" in input && input.admin_notes) {
    updatePayload.admin_notes = input.admin_notes;
  }

  if (input.status === "diproses") {
    updatePayload.processed_at = now;
  }

  if (input.status === "selesai") {
    updatePayload.completed_at = now;
  }

  if (input.status === "dibatalkan") {
    updatePayload.cancelled_at = now;
    updatePayload.cancel_reason = (input as any).cancel_reason;
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update(updatePayload)
    .eq("id", params.id);

  if (updateError) {
    return NextResponse.json({ error: "Gagal memperbarui pesanan." }, { status: 500 });
  }

  // Notifikasi in-app ke user
  if (input.status === "selesai") {
    await supabase.from("notifications").insert({
      user_id: order.user_id,
      order_id: order.id,
      channel: "in_app",
      title: "Laporan Siap Diunduh",
      body: `Laporan pesanan ${order.order_number} sudah siap. Buka riwayat pesanan untuk mengunduh.`,
    });

    // Trigger Edge Function notifikasi WA (fire & forget)
    supabase.functions
      .invoke("send-notification", {
        body: { order_id: order.id, event: "order_completed" },
      })
      .catch(console.error);
  }

  return NextResponse.json({ data: { id: params.id, status: input.status } });
}
