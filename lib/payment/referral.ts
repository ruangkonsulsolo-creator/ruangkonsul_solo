import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * FR-P06 / FR-D18: kreditkan komisi ke referrer saat user yang dia ajak
 * melakukan pembelian berbayar PERTAMA. Pembelian berikutnya tidak menambah komisi.
 *
 * Persentase: env REFERRAL_COMMISSION_PERCENT (default 10).
 */
export async function creditReferralIfFirstPurchase(params: {
  userId: string;
  amountIdr: number;
  orderId?: string | null;
  label: string;
}): Promise<void> {
  if (params.amountIdr <= 0) return;

  const admin = createAdminClient();
  const percent = Number(process.env.REFERRAL_COMMISSION_PERCENT ?? 10);

  const { data: profile } = await admin
    .from("profiles")
    .select("referred_by")
    .eq("id", params.userId)
    .single();

  const referrerId = profile?.referred_by as string | null | undefined;
  if (!referrerId || referrerId === params.userId) return;

  const { data: existing } = await admin
    .from("referrals")
    .select("id, is_credited")
    .eq("referrer_id", referrerId)
    .eq("referred_id", params.userId)
    .maybeSingle();

  if (existing?.is_credited) return;

  const commission = Math.floor((params.amountIdr * percent) / 100);
  if (commission <= 0) return;

  // Klaim atomik: hanya satu proses yang berhasil men-set is_credited
  if (existing) {
    const { data: claimed } = await admin
      .from("referrals")
      .update({
        is_credited: true,
        credited_at: new Date().toISOString(),
        commission_idr: commission,
        order_id: params.orderId ?? null,
      })
      .eq("id", existing.id)
      .eq("is_credited", false)
      .select("id");
    if (!claimed || claimed.length === 0) return;
  } else {
    const { error } = await admin.from("referrals").insert({
      referrer_id: referrerId,
      referred_id: params.userId,
      order_id: params.orderId ?? null,
      commission_idr: commission,
      is_credited: true,
      credited_at: new Date().toISOString(),
    });
    // unique (referrer_id, referred_id) → proses lain sudah duluan
    if (error) return;
  }

  await admin.rpc("increment_credit_balance", { user_id: referrerId, amount: commission });

  await admin.from("transactions").insert({
    user_id: referrerId,
    type: "referral_credit",
    amount_idr: commission,
    reference_id: params.orderId ?? null,
    reference_type: params.orderId ? "order" : null,
    notes: `Komisi referral ${percent}% dari ${params.label}`,
  });

  await admin.from("notifications").insert({
    user_id: referrerId,
    channel: "in_app",
    title: "Komisi Referral Masuk 🎉",
    body: `Kamu mendapat kredit Rp${commission.toLocaleString("id-ID")} dari referral.`,
  });
}
