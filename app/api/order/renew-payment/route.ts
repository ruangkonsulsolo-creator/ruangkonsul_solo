import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/security/rate-limit";
import { z } from "zod";
import { requireUser } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { startPayment, getCustomerDetails, findReusablePayment } from "@/lib/payment/checkout";
import { cancelTransaction, classifyStatus, getTransactionStatus } from "@/lib/payment/midtrans";
import { applyMidtransStatus } from "@/lib/payment/fulfillment";

export const dynamic = "force-dynamic";

const schema = z.object({ order_id: z.string().uuid() });

/**
 * "Bayar Sekarang" untuk pesanan yang masih menunggu pembayaran.
 * - Jika transaksi pending masih berlaku (< 23 jam) → pakai token yang sama.
 * - Jika sudah lewat → batalkan transaksi lama dan buat transaksi Midtrans baru
 *   (Midtrans menolak order_id yang sama dipakai dua kali).
 */
export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user } = auth.ctx;

  if (!(await rateLimit(`renew:${user.id}`, 60, 10))) {
    return NextResponse.json({ error: "Terlalu banyak permintaan. Coba lagi sebentar." }, { status: 429 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "order_id tidak valid." }, { status: 422 });

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, order_number, price_idr, status, midtrans_order_id, services(name, slug)")
    .eq("id", parsed.data.order_id)
    .eq("user_id", user.id)
    .single();

  if (!order) return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
  if (order.status !== "menunggu_pembayaran") {
    return NextResponse.json({ error: "Pesanan tidak dalam status menunggu pembayaran." }, { status: 400 });
  }

  const reusable = await findReusablePayment("order", order.id, user.id);
  if (reusable?.snap_token) {
    return NextResponse.json({ data: { snap_token: reusable.snap_token, payment_id: reusable.id } });
  }

  // Transaksi lama kedaluwarsa → tandai & batalkan di Midtrans agar tidak bisa dibayar ganda
  if (order.midtrans_order_id) {
    // Cek dulu: mungkin user sudah membayar tapi webhook belum sampai
    const remote = await getTransactionStatus(order.midtrans_order_id).catch(() => null);
    if (remote && classifyStatus(remote.transaction_status, remote.fraud_status) === "paid") {
      await applyMidtransStatus(remote);
      return NextResponse.json({ error: "Pesanan ini sudah dibayar.", paid: true }, { status: 409 });
    }
    // Selain 'paid': JANGAN lewat applyMidtransStatus (itu akan membatalkan pesanan) —
    // cukup pensiunkan transaksi lama lalu buat yang baru.
    await cancelTransaction(order.midtrans_order_id);
    await admin
      .from("payments")
      .update({ status: "expired" })
      .eq("midtrans_order_id", order.midtrans_order_id)
      .eq("status", "pending");
  }

  const svc = (Array.isArray(order.services) ? order.services[0] : order.services) as
    | { name: string; slug: string }
    | null;

  try {
    const payment = await startPayment({
      purpose: "order",
      referenceId: order.id,
      displayRef: order.order_number,
      userId: user.id,
      amountIdr: order.price_idr,
      items: [{ id: svc?.slug ?? "layanan", price: order.price_idr, quantity: 1, name: svc?.name ?? "Layanan" }],
      customer: await getCustomerDetails(user.id, user.email),
      finishPath: `/dashboard/riwayat-pesanan?order=${order.id}`,
    });

    await admin
      .from("orders")
      .update({ midtrans_order_id: payment.midtransOrderId, midtrans_snap_token: payment.snapToken })
      .eq("id", order.id);

    return NextResponse.json({ data: { snap_token: payment.snapToken, payment_id: payment.paymentId } });
  } catch (err) {
    console.error("[renew-payment] error:", err);
    return NextResponse.json({ error: "Gagal membuat ulang pembayaran." }, { status: 502 });
  }
}
