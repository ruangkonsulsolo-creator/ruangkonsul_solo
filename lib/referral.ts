import "server-only";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWhatsApp, waTemplates } from "@/lib/notification/whatsapp";
import { formatRupiah } from "@/lib/utils/format-currency";

export const COOKIE_REF = "rk_ref";
const POLA_KODE = /^RKS-[A-Z0-9]{5}$/i;

export function kodeReferralValid(kode: unknown): kode is string {
  return typeof kode === "string" && POLA_KODE.test(kode.trim());
}

/**
 * Catat pengajak untuk akun yang baru masuk/daftar. Kode diambil dari
 * metadata pendaftaran email, atau dari cookie yang disimpan saat membuka
 * /daftar?ref=… (supaya pendaftaran lewat Google tetap tercatat).
 */
export async function pasangReferral(userId: string, kodeMetadata?: unknown) {
  const jar = cookies();
  const kode = kodeReferralValid(kodeMetadata) ? kodeMetadata : jar.get(COOKIE_REF)?.value;
  if (!kodeReferralValid(kode)) return;
  try {
    const { error } = await createAdminClient().rpc("pasang_referral", { p_user: userId, p_kode: kode.trim() });
    if (error) console.warn("[referral] pasang:", error.message);
  } catch (e) {
    console.warn("[referral] pasang gagal:", e);
  }
  try {
    jar.delete(COOKIE_REF);
  } catch {
    /* cookies read-only di konteks ini */
  }
}

/** Komisi referral dari pembayaran lunas pertama. Aman dipanggil berulang. */
export async function kreditReferral(userId: string, jumlah: number) {
  const persen = Number(process.env.REFERRAL_COMMISSION_PERCENT ?? 10);
  const admin = createAdminClient();
  const { data: komisi, error } = await admin.rpc("kredit_referral", {
    p_referred: userId,
    p_jumlah: jumlah,
    p_persen: Number.isFinite(persen) ? persen : 10,
  });
  if (error) {
    // Migrasi 045 belum dijalankan → jangan ganggu pembayaran.
    console.warn("[referral] kredit:", error.message);
    return;
  }
  const n = Number(komisi ?? 0);
  if (n <= 0) return;

  const { data: ref } = await admin.from("profiles").select("referred_by").eq("id", userId).maybeSingle();
  if (!ref?.referred_by) return;
  await admin.from("notifications").insert({
    user_id: ref.referred_by,
    channel: "in_app",
    title: "Komisi Referral Masuk",
    body: `Temanmu menyelesaikan pembayaran pertamanya. Komisi ${formatRupiah(n)} sudah masuk ke saldomu.`,
  });
  const { data: p } = await admin.from("profiles").select("whatsapp").eq("id", ref.referred_by).maybeSingle();
  await sendWhatsApp({ to: p?.whatsapp, message: waTemplates.referralCredited(formatRupiah(n)) });
}
