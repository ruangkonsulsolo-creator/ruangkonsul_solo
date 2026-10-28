import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { BRAND } from "@/lib/brand";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!authHeader || authHeader !== `Bearer ${serviceKey}`) {
    return NextResponse.json({ error: "Tidak terotorisasi." }, { status: 401 });
  }

  let body: { order_id: string; event: "order_received" | "order_completed" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const supabase = createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, user_id, services(name), profiles(full_name, whatsapp)")
    .eq("id", body.order_id)
    .single();

  if (!order) {
    return NextResponse.json({ error: "Order tidak ditemukan." }, { status: 404 });
  }

  const profile = order.profiles as any;
  const service = order.services as any;
  const whatsapp = profile?.whatsapp as string | null;

  if (!whatsapp) {
    return NextResponse.json({ data: "skipped — no whatsapp number" });
  }

  const message =
    body.event === "order_received"
      ? `✅ *${BRAND.name}* — Halo ${profile?.full_name ?? "Kak"}!\n\nPesanan *${order.order_number}* (${service?.name}) telah kami terima dan sedang dalam antrian proses.\n\nKami akan segera memberitahu kamu saat laporan selesai. 📚`
      : `🎉 *${BRAND.name}* — Laporan pesanan *${order.order_number}* (${service?.name}) sudah siap!\n\nBuka dashboard untuk mengunduh laporan kamu:\n${process.env.NEXT_PUBLIC_APP_URL}/dashboard/riwayat-pesanan\n\n_Link laporan aktif selama 1 jam._`;

  const fonnteRes = await fetch("https://api.fonnte.com/send", {
    method: "POST",
    headers: {
      Authorization: process.env.FONNTE_API_KEY ?? "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      target: whatsapp,
      message,
      countryCode: "62",
    }),
  });

  const fonnteData = await fonnteRes.json().catch(() => ({}));

  if (!fonnteRes.ok) {
    console.error("Fonnte error:", fonnteData);
    return NextResponse.json({ error: "Gagal mengirim WA.", detail: fonnteData }, { status: 500 });
  }

  await supabase.from("notifications").insert({
    user_id: order.user_id,
    order_id: order.id,
    channel: "whatsapp",
    title: body.event === "order_received" ? "Pesanan Diterima" : "Laporan Siap",
    body: message,
  });

  return NextResponse.json({ data: "sent", fonnte: fonnteData });
}
