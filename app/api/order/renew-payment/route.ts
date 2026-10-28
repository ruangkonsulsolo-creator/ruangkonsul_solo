import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });

  const { order_id } = await request.json();

  // Ambil order
  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, price_idr, status, midtrans_order_id, midtrans_snap_token, services(name), user_id")
    .eq("id", order_id)
    .eq("user_id", user.id)
    .single();

  if (!order) return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
  if (order.status !== "menunggu_pembayaran") {
    return NextResponse.json({ error: "Pesanan tidak dalam status menunggu pembayaran." }, { status: 400 });
  }

  // Kalau masih ada snap token, return langsung
  if (order.midtrans_snap_token) {
    return NextResponse.json({ data: { snap_token: order.midtrans_snap_token } });
  }

  // Buat Midtrans transaction baru
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, whatsapp")
    .eq("id", user.id)
    .single();

  const midtransOrderId = order.midtrans_order_id ?? `KALIBRI-${order.order_number}-R`;

  try {
    const midtransAuth = Buffer.from(`${process.env.MIDTRANS_SERVER_KEY}:`).toString("base64");
    const isSandbox = process.env.MIDTRANS_IS_PRODUCTION !== "true";
    const url = isSandbox
      ? "https://app.sandbox.midtrans.com/snap/v1/transactions"
      : "https://app.midtrans.com/snap/v1/transactions";

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${midtransAuth}` },
      body: JSON.stringify({
        transaction_details: { order_id: midtransOrderId, gross_amount: order.price_idr },
        item_details: [{ id: "service", price: order.price_idr, quantity: 1, name: (order.services as any)?.name ?? "Layanan" }],
        customer_details: {
          first_name: profile?.full_name ?? "User",
          email: user.email,
          phone: profile?.whatsapp ?? undefined,
        },
      }),
    });

    const data = await res.json();
    if (!data.token) throw new Error(data.error_messages?.join(", ") ?? "Midtrans error");

    await supabase.from("orders").update({
      midtrans_order_id: midtransOrderId,
      midtrans_snap_token: data.token,
    }).eq("id", order.id);

    return NextResponse.json({ data: { snap_token: data.token } });
  } catch (err) {
    console.error("Renew payment error:", err);
    return NextResponse.json({ error: "Gagal membuat ulang pembayaran." }, { status: 500 });
  }
}
