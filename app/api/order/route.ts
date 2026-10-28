import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createOrderSchema } from "@/lib/validators/order.schema";
import { generateOrderNumber } from "@/lib/utils/generate-order-number";

export async function POST(request: NextRequest) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  // Validasi body
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

  // Ambil service
  const { data: service } = await supabase
    .from("services")
    .select("id, price_idr, name")
    .eq("slug", service_slug)
    .eq("is_active", true)
    .single();

  if (!service) {
    return NextResponse.json({ error: "Layanan tidak ditemukan." }, { status: 404 });
  }

  // Verifikasi kepemilikan file
  const { data: file } = await supabase
    .from("uploaded_files")
    .select("id")
    .eq("id", file_id)
    .eq("user_id", user.id)
    .eq("is_deleted", false)
    .single();

  if (!file) {
    return NextResponse.json({ error: "File tidak ditemukan." }, { status: 404 });
  }

  // Generate order number — ambil count orders hari ini untuk sequence
  const today = new Date().toISOString().slice(0, 10);
  const { count } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .gte("created_at", `${today}T00:00:00Z`);

  const orderNumber = generateOrderNumber((count ?? 0) + 1);

  // --- PAKAI KUOTA ---
  if (use_quota_id) {
    const { data: quota } = await supabase
      .from("user_quotas")
      .select("id, quota_remaining, service_id")
      .eq("id", use_quota_id)
      .eq("user_id", user.id)
      .eq("is_expired", false)
      .single();

    if (!quota) {
      return NextResponse.json({ error: "Kuota tidak ditemukan atau sudah kedaluwarsa." }, { status: 400 });
    }

    if (quota.service_id !== service.id) {
      return NextResponse.json({ error: "Kuota tidak berlaku untuk layanan ini." }, { status: 400 });
    }

    if (quota.quota_remaining <= 0) {
      return NextResponse.json({ error: "Saldo kuota habis." }, { status: 400 });
    }

    // Buat order langsung diproses
    const { data: order, error: orderError } = await supabase
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
        paid_at: new Date().toISOString(),
      })
      .select("id, order_number, status")
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Gagal membuat pesanan." }, { status: 500 });
    }

    // Kurangi saldo kuota
    await supabase
      .from("user_quotas")
      .update({ quota_remaining: quota.quota_remaining - 1 })
      .eq("id", quota.id);

    // Catat transaksi
    await supabase.from("transactions").insert({
      user_id: user.id,
      type: "order_payment",
      amount_idr: 0,
      reference_id: order.id,
      reference_type: "order",
      notes: `Kuota dipakai untuk pesanan ${orderNumber}`,
    });

    // Notifikasi in-app
    await supabase.from("notifications").insert({
      user_id: user.id,
      order_id: order.id,
      channel: "in_app",
      title: "Pesanan Diterima",
      body: `Pesanan ${orderNumber} (${service.name}) sedang diproses.`,
    });

    return NextResponse.json({
      data: {
        order_id: order.id,
        order_number: order.order_number,
        status: order.status,
        payment_method: "quota",
        quota_remaining: quota.quota_remaining - 1,
      },
    });
  }

  // --- BAYAR SATUAN VIA MIDTRANS ---
  const midtransOrderId = `KALIBRI-${orderNumber}`;

  // Buat order dengan status menunggu_pembayaran dulu
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      order_number: orderNumber,
      user_id: user.id,
      service_id: service.id,
      file_id: file.id,
      price_idr: service.price_idr,
      status: "menunggu_pembayaran",
      payment_method: "midtrans",
      midtrans_order_id: midtransOrderId,
    })
    .select("id, order_number, status")
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: "Gagal membuat pesanan." }, { status: 500 });
  }

  // Ambil profil user untuk Midtrans
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, whatsapp")
    .eq("id", user.id)
    .single();

  // Buat Midtrans SNAP token
  try {
    const midtransAuth = Buffer.from(
      `${process.env.MIDTRANS_SERVER_KEY}:`
    ).toString("base64");

    const isSandbox = process.env.MIDTRANS_IS_PRODUCTION !== "true";
    const midtransUrl = isSandbox
      ? "https://app.sandbox.midtrans.com/snap/v1/transactions"
      : "https://app.midtrans.com/snap/v1/transactions";

    const midtransPayload = {
      transaction_details: {
        order_id: midtransOrderId,
        gross_amount: service.price_idr,
      },
      item_details: [
        {
          id: service_slug,
          price: service.price_idr,
          quantity: 1,
          name: service.name,
        },
      ],
      customer_details: {
        first_name: profile?.full_name ?? user.email?.split("@")[0] ?? "User",
        email: user.email,
        phone: profile?.whatsapp ?? undefined,
      },
      callbacks: {
        finish: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/riwayat-pesanan?order=${order.id}`,
        error: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/riwayat-pesanan?error=payment_failed`,
        pending: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/riwayat-pesanan?order=${order.id}`,
      },
    };

    const snapRes = await fetch(midtransUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${midtransAuth}`,
      },
      body: JSON.stringify(midtransPayload),
    });

    const snapData = await snapRes.json();

    if (!snapData.token) {
      throw new Error(snapData.error_messages?.join(", ") ?? "Midtrans error");
    }

    // Simpan snap token
    await supabase
      .from("orders")
      .update({ midtrans_snap_token: snapData.token })
      .eq("id", order.id);

    return NextResponse.json({
      data: {
        order_id: order.id,
        order_number: order.order_number,
        status: order.status,
        payment_method: "midtrans",
        snap_token: snapData.token,
      },
    });
  } catch (err) {
    console.error("Midtrans error:", err);
    // Batalkan order jika Midtrans gagal
    await supabase.from("orders").update({ status: "dibatalkan", cancel_reason: "Midtrans error" }).eq("id", order.id);
    return NextResponse.json(
      { error: "Gagal membuat transaksi pembayaran. Coba lagi." },
      { status: 500 }
    );
  }
}
