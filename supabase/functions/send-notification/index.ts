// Supabase Edge Function: send-notification
// Dipanggil oleh Postgres trigger atau API route saat status order berubah

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface NotificationPayload {
  order_id: string;
  event: "order_received" | "order_completed";
}

Deno.serve(async (req) => {
  const payload: NotificationPayload = await req.json();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Ambil detail order + profil user
  const { data: order, error } = await supabase
    .from("orders")
    .select("*, profiles(full_name, whatsapp), services(name)")
    .eq("id", payload.order_id)
    .single();

  if (error || !order) {
    return new Response(JSON.stringify({ error: "Order tidak ditemukan" }), { status: 404 });
  }

  const whatsapp = order.profiles?.whatsapp;

  // Kirim WA jika nomor tersedia
  if (whatsapp) {
    const message =
      payload.event === "order_received"
        ? `✅ *Kalibri* — Pesanan *${order.order_number}* (${order.services?.name}) telah diterima dan sedang diproses.`
        : `🎉 *Kalibri* — Laporan pesanan *${order.order_number}* sudah siap! Buka dashboard kamu untuk mengunduh laporan.`;

    await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: Deno.env.get("FONNTE_API_KEY")!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ target: whatsapp, message }),
    });
  }

  // Simpan notifikasi in-app
  await supabase.from("notifications").insert({
    user_id: order.user_id,
    order_id: order.id,
    channel: "in_app",
    title:
      payload.event === "order_received"
        ? "Pesanan Diterima"
        : "Laporan Siap Diunduh",
    body:
      payload.event === "order_received"
        ? `Pesanan ${order.order_number} sedang diproses.`
        : `Laporan ${order.order_number} sudah siap. Buka dashboard untuk mengunduh.`,
  });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
