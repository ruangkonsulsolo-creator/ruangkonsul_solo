// Supabase Edge Function: process-referral-credit
// Dipanggil setelah pembayaran pertama dari referred user berhasil

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface ReferralPayload {
  referred_user_id: string;
  order_id: string;
  order_amount_idr: number;
}

Deno.serve(async (req) => {
  const payload: ReferralPayload = await req.json();
  const commissionPercent = Number(Deno.env.get("REFERRAL_COMMISSION_PERCENT") ?? 10);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Cek apakah user ini punya referrer
  const { data: profile } = await supabase
    .from("profiles")
    .select("referred_by")
    .eq("id", payload.referred_user_id)
    .single();

  if (!profile?.referred_by) {
    return new Response(JSON.stringify({ ok: true, skipped: "no referrer" }));
  }

  const referrerId = profile.referred_by;
  const commissionIdr = Math.floor(payload.order_amount_idr * commissionPercent / 100);

  // Cek apakah komisi sudah pernah dikreditkan (hanya untuk pembelian pertama)
  const { data: existingReferral } = await supabase
    .from("referrals")
    .select("id, is_credited")
    .eq("referrer_id", referrerId)
    .eq("referred_id", payload.referred_user_id)
    .single();

  if (existingReferral?.is_credited) {
    return new Response(JSON.stringify({ ok: true, skipped: "already credited" }));
  }

  // Catat referral dan kredit komisi
  await supabase.from("referrals").upsert({
    referrer_id: referrerId,
    referred_id: payload.referred_user_id,
    order_id: payload.order_id,
    commission_idr: commissionIdr,
    is_credited: true,
    credited_at: new Date().toISOString(),
  });

  // Tambah kredit ke saldo referrer
  await supabase.rpc("increment_credit_balance", {
    user_id: referrerId,
    amount: commissionIdr,
  });

  // Catat transaksi
  await supabase.from("transactions").insert({
    user_id: referrerId,
    type: "referral_credit",
    amount_idr: commissionIdr,
    reference_id: payload.order_id,
    reference_type: "order",
    notes: `Komisi referral ${commissionPercent}% dari pesanan`,
  });

  return new Response(JSON.stringify({ ok: true, commission_idr: commissionIdr }), {
    headers: { "Content-Type": "application/json" },
  });
});
