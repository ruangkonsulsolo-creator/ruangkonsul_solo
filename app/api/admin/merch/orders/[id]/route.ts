import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, STAFF_ROLES } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWhatsApp } from "@/lib/notification/whatsapp";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-dynamic";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("ship"), courier: z.string().trim().min(2).max(40), tracking_number: z.string().trim().min(4).max(60) }),
  z.object({ action: z.literal("complete") }),
  z.object({ action: z.literal("cancel"), reason: z.string().trim().min(3).max(200) }),
]);

/** Admin memproses pesanan merch: kirim (resi), selesai, atau batalkan. */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(STAFF_ROLES);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Input tidak valid." }, { status: 422 });

  const admin = createAdminClient();
  const { data: order } = await admin.from("merch_orders").select("id, user_id, order_number, status, recipient_phone").eq("id", params.id).single();
  if (!order) return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });

  const now = new Date().toISOString();
  const input = parsed.data;
  let patch: Record<string, unknown>;
  let fromStatus: string[];
  let notif: string;

  if (input.action === "ship") {
    fromStatus = ["dibayar", "dikirim"];
    patch = { status: "dikirim", courier: input.courier, tracking_number: input.tracking_number, shipped_at: now };
    notif = `Pesanan ${order.order_number} dikirim via ${input.courier}. No. resi: ${input.tracking_number}`;
  } else if (input.action === "complete") {
    fromStatus = ["dikirim"];
    patch = { status: "selesai", completed_at: now };
    notif = `Pesanan ${order.order_number} selesai. Terima kasih sudah berbelanja!`;
  } else {
    // Pembatalan pesanan yang sudah dibayar → refund manual oleh admin
    fromStatus = ["dibayar"];
    patch = { status: "dibatalkan", cancelled_at: now, cancel_reason: input.reason };
    notif = `Pesanan ${order.order_number} dibatalkan: ${input.reason}. Tim kami akan memproses refund.`;
  }

  if (!fromStatus.includes(order.status)) {
    return NextResponse.json({ error: `Tidak bisa dari status "${order.status}".` }, { status: 409 });
  }

  const { error } = await admin.from("merch_orders").update(patch).eq("id", order.id).eq("status", order.status);
  if (error) return NextResponse.json({ error: "Gagal memperbarui pesanan." }, { status: 500 });
  if (input.action === "cancel") await admin.rpc("release_merch_stock", { p_order_id: order.id });

  await admin.from("notifications").insert({ user_id: order.user_id, channel: "in_app", title: "Update Pesanan Merchandise", body: notif });
  sendWhatsApp({ to: order.recipient_phone, message: `📦 *${BRAND.name}* — ${notif}` }).catch(() => undefined);

  return NextResponse.json({ data: "ok" });
}
