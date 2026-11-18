import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createOrderSchema } from "@/lib/validators/order.schema";
import { generateOrderNumber } from "@/lib/utils/generate-order-number";
import { startPayment, getCustomerDetails } from "@/lib/payment/checkout";
import { runDetectionPipeline } from "@/lib/detection/pipeline";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireUser(["user"]);
  if (!auth.ok) {
    const msg = auth.status === 403 ? "Hanya akun customer yang bisa membuat pesanan." : auth.error;
    return NextResponse.json({ error: msg }, { status: auth.status });
  }
  const { user } = auth.ctx;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body tidak valid." }, { status: 400 });
  }

  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Input tidak valid." },
      { status: 422 }
    );
  }

  const { file_id, service_slug, use_quota_id } = parsed.data;

  // Semua tulis via service role; harga SELALU diambil dari DB, bukan dari client.
  const admin = createAdminClient();

  const { data: service } = await admin
    .from("services")
    .select("id, price_idr, name, slug")
    .eq("slug", service_slug)
    .eq("is_active", true)
    .single();

  if (!service) {
    return NextResponse.json({ error: "Layanan tidak ditemukan." }, { status: 404 });
  }

  // Verifikasi kepemilikan file
  const { data: file } = await admin
    .from("uploaded_files")
    .select("id")
    .eq("id", file_id)
    .eq("user_id", user.id)
    .eq("is_deleted", false)
    .single();

  if (!file) {
    return NextResponse.json({ error: "File tidak ditemukan." }, { status: 404 });
  }

  // File yang sudah dipakai di pesanan aktif tidak boleh dipesan ulang
  const { count: activeOrders } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("file_id", file.id)
    .neq("status", "dibatalkan");
  if ((activeOrders ?? 0) > 0) {
    return NextResponse.json({ error: "File ini sudah dipakai di pesanan lain. Upload ulang file." }, { status: 409 });
  }

  const orderNumber = generateOrderNumber();

  // ─── PAKAI KUOTA ───────────────────────────────────────────────────────────
  if (use_quota_id) {
    const { data: quota } = await admin
      .from("user_quotas")
      .select("id, service_id")
      .eq("id", use_quota_id)
      .eq("user_id", user.id)
      .single();

    if (!quota) {
      return NextResponse.json({ error: "Kuota tidak ditemukan atau sudah kedaluwarsa." }, { status: 400 });
    }
    if (quota.service_id !== service.id) {
      return NextResponse.json({ error: "Kuota tidak berlaku untuk layanan ini." }, { status: 400 });
    }

    // Potong kuota secara atomik (mencegah double-spend saat klik berulang)
    const { data: remaining, error: quotaError } = await admin.rpc("consume_quota", {
      p_quota_id: quota.id,
      p_user_id: user.id,
    });
    if (quotaError) {
      return NextResponse.json({ error: "Saldo kuota habis atau sudah kedaluwarsa." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({
        order_number: orderNumber,
        user_id: user.id,
        service_id: service.id,
        file_id: file.id,
        price_idr: 0,
        used_quota_id: quota.id,
        status: "diproses",
        payment_method: "quota",
        paid_at: now,
      })
      .select("id, order_number, status, user_id, file_id")
      .single();

    if (orderError || !order) {
      // Kembalikan kuota yang sudah terpotong
      const { data: q } = await admin.from("user_quotas").select("quota_remaining").eq("id", quota.id).single();
      if (q) await admin.from("user_quotas").update({ quota_remaining: q.quota_remaining + 1 }).eq("id", quota.id);
      return NextResponse.json({ error: "Gagal membuat pesanan." }, { status: 500 });
    }

    await admin.from("transactions").insert({
      user_id: user.id,
      type: "order_payment",
      amount_idr: 0,
      reference_id: order.id,
      reference_type: "order",
      notes: `Kuota dipakai untuk pesanan ${orderNumber}`,
    });

    await admin.from("notifications").insert({
      user_id: user.id,
      order_id: order.id,
      channel: "in_app",
      title: "Pesanan Diterima",
      body: `Pesanan ${orderNumber} (${service.name}) sedang diproses.`,
    });

    runDetectionPipeline(order.id, {
      user_id: order.user_id,
      order_number: order.order_number,
      file_id: order.file_id,
      services: { name: service.name, slug: service.slug },
      profiles: null,
    }).catch((err) => console.error("[order] detection pipeline error:", err));

    return NextResponse.json({
      data: {
        order_id: order.id,
        order_number: order.order_number,
        status: order.status,
        payment_method: "quota",
        quota_remaining: remaining,
      },
    });
  }

  // ─── BAYAR SATUAN VIA MIDTRANS ─────────────────────────────────────────────
  if (!service.price_idr || service.price_idr <= 0) {
    return NextResponse.json({ error: "Harga layanan belum dikonfigurasi." }, { status: 400 });
  }

  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      order_number: orderNumber,
      user_id: user.id,
      service_id: service.id,
      file_id: file.id,
      price_idr: service.price_idr,
      status: "menunggu_pembayaran",
      payment_method: "midtrans",
    })
    .select("id, order_number, status")
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: "Gagal membuat pesanan." }, { status: 500 });
  }

  try {
    const payment = await startPayment({
      purpose: "order",
      referenceId: order.id,
      displayRef: order.order_number,
      userId: user.id,
      amountIdr: service.price_idr,
      items: [{ id: service.slug, price: service.price_idr, quantity: 1, name: service.name }],
      customer: await getCustomerDetails(user.id, user.email),
      finishPath: `/dashboard/riwayat-pesanan?order=${order.id}`,
    });

    await admin
      .from("orders")
      .update({ midtrans_order_id: payment.midtransOrderId, midtrans_snap_token: payment.snapToken })
      .eq("id", order.id);

    return NextResponse.json({
      data: {
        order_id: order.id,
        order_number: order.order_number,
        status: order.status,
        payment_method: "midtrans",
        payment_id: payment.paymentId,
        snap_token: payment.snapToken,
      },
    });
  } catch (err) {
    console.error("[order] Midtrans error:", err);
    await admin
      .from("orders")
      .update({ status: "dibatalkan", cancelled_at: new Date().toISOString(), cancel_reason: "Gagal membuat transaksi Midtrans" })
      .eq("id", order.id);
    return NextResponse.json({ error: "Gagal membuat transaksi pembayaran. Coba lagi." }, { status: 502 });
  }
}
