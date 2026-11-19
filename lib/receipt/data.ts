import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ReceiptItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface ReceiptData {
  paymentId: string;
  receiptNumber: string | null;
  status: string;
  purpose: "order" | "produk";
  purposeLabel: string;
  referenceLabel: string | null; // order_number / booking_number / nama paket
  midtransOrderId: string;
  transactionId: string | null;
  paymentType: string | null;
  amountIdr: number;
  paidAt: string | null;
  createdAt: string;
  customer: { name: string; email: string | null; whatsapp: string | null };
  items: ReceiptItem[];
  userId: string;
}

export const PURPOSE_LABEL: Record<ReceiptData["purpose"], string> = {
  order: "Layanan Dokumen",
  produk: "Produk / Bimbingan",
};

const PAYMENT_TYPE_LABEL: Record<string, string> = {
  qris: "QRIS",
  gopay: "GoPay",
  shopeepay: "ShopeePay",
  bank_transfer: "Transfer Bank (VA)",
  echannel: "Mandiri Bill",
  credit_card: "Kartu Kredit/Debit",
  cstore: "Gerai Retail",
  akulaku: "Akulaku",
};

export function paymentTypeLabel(t: string | null | undefined, raw?: Record<string, unknown> | null): string {
  if (!t) return "-";
  // VA: tampilkan nama bank
  const va = (raw?.va_numbers as Array<{ bank?: string }> | undefined)?.[0]?.bank;
  if (t === "bank_transfer" && va) return `Virtual Account ${va.toUpperCase()}`;
  if (t === "bank_transfer" && raw?.permata_va_number) return "Virtual Account PERMATA";
  return PAYMENT_TYPE_LABEL[t] ?? t.replace(/_/g, " ");
}

/** Ambil data receipt. Pemanggil WAJIB sudah memeriksa hak akses (pemilik / staff). */
export async function getReceipt(paymentId: string): Promise<ReceiptData | null> {
  const admin = createAdminClient();
  const { data: p } = await admin
    .from("payments")
    .select(
      "id, receipt_number, status, purpose, reference_id, midtrans_order_id, transaction_id, payment_type, amount_idr, paid_at, created_at, customer_snapshot, item_snapshot, raw_notification, user_id"
    )
    .eq("id", paymentId)
    .maybeSingle();
  if (!p) return null;

  // Data customer: snapshot saat checkout, fallback ke profil
  let customer = (p.customer_snapshot ?? null) as ReceiptData["customer"] | null;
  if (!customer) {
    const { data: prof } = await admin.from("profiles").select("full_name, whatsapp").eq("id", p.user_id).single();
    customer = { name: prof?.full_name || "Customer", email: null, whatsapp: prof?.whatsapp ?? null };
  }

  let referenceLabel: string | null = null;
  const purpose = p.purpose as ReceiptData["purpose"];
  if (purpose === "order") {
    const { data } = await admin.from("orders").select("order_number").eq("id", p.reference_id).maybeSingle();
    referenceLabel = data?.order_number ?? null;
  } else if (purpose === "produk") {
    const { data } = await admin.from("pesanan_produk").select("nomor").eq("id", p.reference_id).maybeSingle();
    referenceLabel = data?.nomor ?? null;
  }

  const items: ReceiptItem[] =
    Array.isArray(p.item_snapshot) && p.item_snapshot.length
      ? (p.item_snapshot as ReceiptItem[])
      : [{ id: purpose, name: `${PURPOSE_LABEL[purpose]}${referenceLabel ? ` — ${referenceLabel}` : ""}`, price: p.amount_idr, quantity: 1 }];

  return {
    paymentId: p.id,
    receiptNumber: p.receipt_number,
    status: p.status,
    purpose,
    purposeLabel: PURPOSE_LABEL[purpose],
    referenceLabel,
    midtransOrderId: p.midtrans_order_id,
    transactionId: p.transaction_id,
    paymentType: paymentTypeLabel(p.payment_type, p.raw_notification as Record<string, unknown> | null),
    amountIdr: p.amount_idr,
    paidAt: p.paid_at,
    createdAt: p.created_at,
    customer,
    items,
    userId: p.user_id,
  };
}

/** Untuk halaman verifikasi publik: hanya data minimal, nama disamarkan. */
export async function verifyReceipt(receiptNumber: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("payments")
    .select("receipt_number, status, purpose, amount_idr, paid_at, customer_snapshot")
    .eq("receipt_number", receiptNumber.trim().toUpperCase())
    .maybeSingle();
  if (!data) return null;
  const name = String((data.customer_snapshot as { name?: string } | null)?.name ?? "Customer");
  return {
    receiptNumber: data.receipt_number as string,
    status: data.status as string,
    purposeLabel: PURPOSE_LABEL[data.purpose as ReceiptData["purpose"]],
    amountIdr: data.amount_idr as number,
    paidAt: data.paid_at as string | null,
    maskedName: maskName(name),
  };
}

function maskName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length <= 2 ? w[0] + "*" : w[0] + "*".repeat(Math.min(w.length - 2, 5)) + w[w.length - 1]))
    .join(" ");
}

export function formatDateTimeWIB(iso: string | null) {
  if (!iso) return "-";
  return (
    new Date(iso).toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }) + " WIB"
  );
}
