import "server-only";
import { createHash, timingSafeEqual } from "crypto";

/**
 * Midtrans wrapper (Snap + Core status API) berbasis fetch.
 *
 * Env yang dibutuhkan:
 *   MIDTRANS_SERVER_KEY                 — server key (SB-Mid-server-xxx untuk sandbox)
 *   NEXT_PUBLIC_MIDTRANS_CLIENT_KEY     — client key (dipakai snap.js di browser)
 *   MIDTRANS_IS_PRODUCTION              — "true" untuk production, selain itu sandbox
 *   NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION  — sama seperti di atas, untuk browser
 *   NEXT_PUBLIC_APP_URL                 — base URL aplikasi (untuk callback finish)
 */

export const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";

const SNAP_BASE = isProduction
  ? "https://app.midtrans.com/snap/v1"
  : "https://app.sandbox.midtrans.com/snap/v1";

const CORE_BASE = isProduction
  ? "https://api.midtrans.com/v2"
  : "https://api.sandbox.midtrans.com/v2";

/** Lama token Snap berlaku sebelum transaksi otomatis expire. */
export const PAYMENT_EXPIRY_HOURS = 24;

function serverKey(): string {
  const key = process.env.MIDTRANS_SERVER_KEY;
  if (!key) throw new Error("MIDTRANS_SERVER_KEY belum di-set.");
  return key;
}

function authHeader(): string {
  return `Basic ${Buffer.from(`${serverKey()}:`).toString("base64")}`;
}

export class MidtransError extends Error {
  constructor(message: string, public readonly httpStatus?: number, public readonly body?: unknown) {
    super(message);
    this.name = "MidtransError";
  }
}

// ─── Snap ────────────────────────────────────────────────────────────────────

export interface SnapItem {
  id: string;
  price: number;
  quantity: number;
  name: string; // Midtrans membatasi 50 karakter
}

export interface CreateSnapParams {
  orderId: string;
  grossAmount: number;
  customer: { firstName: string; email?: string | null; phone?: string | null };
  items: SnapItem[];
  /** Path relatif tujuan setelah bayar, mis. "/dashboard/riwayat-pesanan" */
  finishPath: string;
}

export async function createSnapTransaction(
  params: CreateSnapParams
): Promise<{ token: string; redirectUrl: string }> {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");

  const itemsTotal = params.items.reduce((s, i) => s + i.price * i.quantity, 0);
  if (itemsTotal !== params.grossAmount) {
    // Midtrans menolak jika jumlah item ≠ gross_amount
    throw new MidtransError(
      `Total item (${itemsTotal}) tidak sama dengan gross_amount (${params.grossAmount}).`
    );
  }

  const payload = {
    transaction_details: {
      order_id: params.orderId,
      gross_amount: params.grossAmount,
    },
    item_details: params.items.map((i) => ({ ...i, name: i.name.slice(0, 50) })),
    customer_details: {
      first_name: params.customer.firstName.slice(0, 255) || "Customer",
      email: params.customer.email ?? undefined,
      phone: params.customer.phone ?? undefined,
    },
    expiry: { unit: "hours", duration: PAYMENT_EXPIRY_HOURS },
    ...(appUrl
      ? {
          callbacks: {
            finish: `${appUrl}${params.finishPath}`,
          },
        }
      : {}),
  };

  const res = await fetch(`${SNAP_BASE}/transactions`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const data = (await res.json().catch(() => ({}))) as {
    token?: string;
    redirect_url?: string;
    error_messages?: string[];
  };

  if (!res.ok || !data.token) {
    throw new MidtransError(
      data.error_messages?.join(", ") ?? `Midtrans Snap error (HTTP ${res.status})`,
      res.status,
      data
    );
  }

  return { token: data.token, redirectUrl: data.redirect_url ?? "" };
}

// ─── Core API: status & cancel ───────────────────────────────────────────────

export interface MidtransNotification {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key?: string;
  transaction_status: string;
  fraud_status?: string;
  payment_type?: string;
  transaction_id?: string;
  [key: string]: unknown;
}

/** Ambil status transaksi langsung dari Midtrans (sumber kebenaran). */
export async function getTransactionStatus(orderId: string): Promise<MidtransNotification | null> {
  const res = await fetch(`${CORE_BASE}/${encodeURIComponent(orderId)}/status`, {
    headers: { Accept: "application/json", Authorization: authHeader() },
    cache: "no-store",
  });
  const data = (await res.json().catch(() => null)) as MidtransNotification | null;

  // Midtrans mengembalikan HTTP 200 dengan status_code "404" jika transaksi belum dibuat
  if (!data || data.status_code === "404" || !data.transaction_status) return null;
  return data;
}

export async function cancelTransaction(orderId: string): Promise<void> {
  await fetch(`${CORE_BASE}/${encodeURIComponent(orderId)}/cancel`, {
    method: "POST",
    headers: { Accept: "application/json", Authorization: authHeader() },
    cache: "no-store",
  }).catch(() => undefined);
}

// ─── Signature & klasifikasi status ──────────────────────────────────────────

/** SHA512(order_id + status_code + gross_amount + server_key) */
export function verifySignature(n: MidtransNotification): boolean {
  if (!n.signature_key) return false;
  const expected = createHash("sha512")
    .update(`${n.order_id}${n.status_code}${n.gross_amount}${serverKey()}`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(String(n.signature_key));
  return a.length === b.length && timingSafeEqual(a, b);
}

export type PaymentOutcome = "paid" | "pending" | "failed" | "expired" | "cancelled" | "refunded";

/**
 * Terjemahkan transaction_status Midtrans → status internal.
 * https://docs.midtrans.com/docs/https-notification-webhooks#status-definition
 */
export function classifyStatus(transactionStatus: string, fraudStatus?: string): PaymentOutcome {
  switch (transactionStatus) {
    case "capture":
      // kartu kredit: 'challenge' perlu review manual → tetap pending
      return fraudStatus === "accept" || !fraudStatus ? "paid" : fraudStatus === "deny" ? "failed" : "pending";
    case "settlement":
      return "paid";
    case "pending":
    case "authorize":
      return "pending";
    case "deny":
    case "failure":
      return "failed";
    case "cancel":
      return "cancelled";
    case "expire":
      return "expired";
    case "refund":
    case "partial_refund":
    case "chargeback":
    case "partial_chargeback":
      return "refunded";
    default:
      return "pending";
  }
}

/** Buat midtrans order_id unik. Midtrans menolak order_id yang pernah dipakai. */
export function makeMidtransOrderId(prefix: "ORD" | "PKG" | "BKG" | "MRC", base: string): string {
  const suffix = Date.now().toString(36).toUpperCase();
  return `RKS-${prefix}-${base}-${suffix}`.slice(0, 50);
}
