import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createSnapTransaction,
  makeMidtransOrderId,
  type SnapItem,
} from "./midtrans";

export type PaymentPurpose = "order" | "package" | "booking";

const PREFIX: Record<PaymentPurpose, "ORD" | "PKG" | "BKG"> = {
  order: "ORD",
  package: "PKG",
  booking: "BKG",
};

export interface StartPaymentParams {
  purpose: PaymentPurpose;
  referenceId: string;
  /** Kode yang mudah dibaca (order_number / booking_number / nama paket) */
  displayRef: string;
  userId: string;
  amountIdr: number;
  items: SnapItem[];
  customer: { firstName: string; email?: string | null; phone?: string | null };
  finishPath: string;
}

export interface StartedPayment {
  paymentId: string;
  midtransOrderId: string;
  snapToken: string;
  redirectUrl: string;
}

/**
 * Buat baris `payments` + transaksi Snap Midtrans.
 * Jika Midtrans gagal, baris payment ditandai 'failed' dan error dilempar ulang.
 */
export async function startPayment(p: StartPaymentParams): Promise<StartedPayment> {
  const admin = createAdminClient();
  const midtransOrderId = makeMidtransOrderId(
    PREFIX[p.purpose],
    p.displayRef.replace(/[^A-Za-z0-9]/g, "").slice(-16)
  );

  const { data: payment, error } = await admin
    .from("payments")
    .insert({
      midtrans_order_id: midtransOrderId,
      user_id: p.userId,
      purpose: p.purpose,
      reference_id: p.referenceId,
      amount_idr: p.amountIdr,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !payment) {
    throw new Error(`Gagal mencatat pembayaran: ${error?.message ?? "unknown"}`);
  }

  try {
    const snap = await createSnapTransaction({
      orderId: midtransOrderId,
      grossAmount: p.amountIdr,
      customer: p.customer,
      items: p.items,
      finishPath: p.finishPath,
    });

    await admin
      .from("payments")
      .update({ snap_token: snap.token, snap_redirect_url: snap.redirectUrl })
      .eq("id", payment.id);

    return {
      paymentId: payment.id,
      midtransOrderId,
      snapToken: snap.token,
      redirectUrl: snap.redirectUrl,
    };
  } catch (err) {
    await admin.from("payments").update({ status: "failed" }).eq("id", payment.id);
    throw err;
  }
}

/** Data customer untuk Midtrans dari profil + email auth. */
export async function getCustomerDetails(userId: string, email?: string | null) {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, whatsapp")
    .eq("id", userId)
    .single();

  return {
    firstName: profile?.full_name || email?.split("@")[0] || "Customer",
    email: email ?? null,
    phone: profile?.whatsapp ?? null,
  };
}

/**
 * Kembalikan pembayaran pending yang masih valid untuk referensi tertentu
 * (supaya user yang klik "Bayar" dua kali tidak membuat 2 transaksi).
 */
export async function findReusablePayment(
  purpose: PaymentPurpose,
  referenceId: string,
  userId: string
) {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString();
  const { data } = await admin
    .from("payments")
    .select("id, midtrans_order_id, snap_token, created_at")
    .eq("purpose", purpose)
    .eq("reference_id", referenceId)
    .eq("user_id", userId)
    .eq("status", "pending")
    .not("snap_token", "is", null)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}
