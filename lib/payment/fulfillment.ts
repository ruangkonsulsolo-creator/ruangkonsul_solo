import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { runDetectionPipeline } from "@/lib/detection/pipeline";
import { sendWhatsApp } from "@/lib/notification/whatsapp";
import { sendEmail } from "@/lib/notification/email";
import { formatRupiah } from "@/lib/utils/format-currency";
import { BRAND } from "@/lib/brand";
import { classifyStatus, type MidtransNotification, type PaymentOutcome } from "./midtrans";

type Admin = ReturnType<typeof createAdminClient>;

interface PaymentRow {
  id: string;
  midtrans_order_id: string;
  user_id: string;
  purpose: "order" | "produk";
  reference_id: string;
  amount_idr: number;
  status: string;
}

export interface ApplyResult {
  ok: boolean;
  outcome: PaymentOutcome;
  changed: boolean;
  purpose?: PaymentRow["purpose"];
  referenceId?: string;
  error?: string;
}

/**
 * Terapkan status Midtrans ke database. Idempotent: notifikasi ganda / sinkron
 * manual tidak memproses dua kali (klaim atomik dari status 'pending').
 * Panggil hanya dengan data terverifikasi (signature valid / GET status Midtrans).
 */
export async function applyMidtransStatus(n: MidtransNotification): Promise<ApplyResult> {
  const admin = createAdminClient();
  const outcome = classifyStatus(n.transaction_status, n.fraud_status);

  let payment = await findPayment(admin, n.order_id);
  if (!payment) payment = await adoptLegacyOrder(admin, n);
  if (!payment) return { ok: false, outcome, changed: false, error: "payment_not_found" };

  if (Math.round(Number(n.gross_amount)) !== payment.amount_idr) {
    console.error(`[payment] gross_amount mismatch ${n.order_id}: midtrans=${n.gross_amount} db=${payment.amount_idr}`);
    return { ok: false, outcome, changed: false, error: "amount_mismatch" };
  }

  const meta = {
    payment_type: n.payment_type ?? null,
    transaction_id: n.transaction_id ?? null,
    raw_notification: n as unknown as Record<string, unknown>,
  };
  const base = { ok: true, outcome, purpose: payment.purpose, referenceId: payment.reference_id };

  if (outcome === "pending") {
    await admin.from("payments").update(meta).eq("id", payment.id).eq("status", "pending");
    return { ...base, changed: false };
  }
  if (outcome === "refunded") {
    const { data } = await admin.from("payments").update({ ...meta, status: "refunded" }).eq("id", payment.id).eq("status", "paid").select("id");
    return { ...base, changed: !!data?.length };
  }

  const { data: claimed } = await admin
    .from("payments")
    .update({ ...meta, status: outcome, paid_at: outcome === "paid" ? new Date().toISOString() : null })
    .eq("id", payment.id)
    .eq("status", "pending")
    .select("id");
  if (!claimed?.length) return { ...base, changed: false };

  try {
    if (outcome === "paid") await fulfil(admin, payment);
    else await handleFailure(admin, payment, outcome);
  } catch (err) {
    console.error(`[payment] fulfilment error ${payment.midtrans_order_id}:`, err);
    // Kembalikan ke pending agar retry webhook Midtrans memproses ulang
    await admin.from("payments").update({ status: "pending", paid_at: null }).eq("id", payment.id).eq("status", outcome);
    return { ...base, changed: false, ok: false, error: "fulfilment_error" };
  }
  return { ...base, changed: true };
}

async function findPayment(admin: Admin, midtransOrderId: string): Promise<PaymentRow | null> {
  const { data } = await admin
    .from("payments")
    .select("id, midtrans_order_id, user_id, purpose, reference_id, amount_idr, status")
    .eq("midtrans_order_id", midtransOrderId)
    .maybeSingle();
  return (data as PaymentRow | null) ?? null;
}

/** Pesanan dokumen dari /api/order lama (belum punya baris payments) → buatkan otomatis. */
async function adoptLegacyOrder(admin: Admin, n: MidtransNotification): Promise<PaymentRow | null> {
  const { data: order } = await admin.from("orders").select("id, user_id, price_idr").eq("midtrans_order_id", n.order_id).maybeSingle();
  if (!order?.price_idr) return null;
  const { data } = await admin
    .from("payments")
    .upsert(
      { midtrans_order_id: n.order_id, user_id: order.user_id, purpose: "order", reference_id: order.id, amount_idr: order.price_idr, status: "pending" },
      { onConflict: "midtrans_order_id" }
    )
    .select("id, midtrans_order_id, user_id, purpose, reference_id, amount_idr, status")
    .single();
  return (data as PaymentRow | null) ?? null;
}

async function fulfil(admin: Admin, p: PaymentRow) {
  if (p.purpose === "produk") return fulfilProduk(admin, p);
  return fulfilOrder(admin, p);
}

// ── Produk katalog ─────────────────────────────────────────────────────────
async function fulfilProduk(admin: Admin, p: PaymentRow) {
  const { data: updated, error } = await admin
    .from("pesanan_produk")
    .update({ status: "dibayar", paid_at: new Date().toISOString() })
    .eq("id", p.reference_id)
    .eq("status", "menunggu_pembayaran")
    .select("id, nomor, nama_produk, jumlah, satuan, whatsapp, alamat");
  if (error) throw new Error(`Gagal update pesanan produk: ${error.message}`);
  const o = updated?.[0];
  if (!o) return;

  const item = `${o.jumlah}× ${o.nama_produk}${o.satuan ? ` (${o.satuan})` : ""}`;
  await admin.from("transactions").insert({
    user_id: p.user_id,
    type: "order_payment",
    amount_idr: p.amount_idr,
    reference_id: o.id,
    reference_type: null,
    gateway_ref: p.midtrans_order_id,
    notes: `Pembayaran produk ${o.nomor}: ${item}`,
  });
  await admin.from("notifications").insert({
    user_id: p.user_id,
    channel: "in_app",
    title: "Pembayaran Berhasil",
    body: `Pesanan ${o.nomor} (${item}) sudah lunas. Klik "Konfirmasi via WhatsApp" di receipt untuk penjadwalan.`,
  });
  sendWhatsApp({
    to: o.whatsapp,
    message: `✅ *${BRAND.name}* — Pembayaran pesanan *${o.nomor}* (${item}) sudah kami terima. Tim kami akan segera menghubungi kamu${o.alamat ? " dan memproses pengiriman" : " untuk penjadwalan"}.`,
  }).catch(() => undefined);
  await sendReceipt(admin, p, item);
}

// ── Pesanan dokumen lama (/api/order) ──────────────────────────────────────
async function fulfilOrder(admin: Admin, p: PaymentRow) {
  const { data: updated, error } = await admin
    .from("orders")
    .update({ status: "diproses", paid_at: new Date().toISOString() })
    .eq("id", p.reference_id)
    .eq("status", "menunggu_pembayaran")
    .select("id, user_id, order_number, file_id, services ( name, slug ), profiles:profiles!orders_user_id_fkey ( whatsapp, full_name )");
  if (error) throw new Error(`Gagal update order: ${error.message}`);
  const raw = updated?.[0];
  if (!raw) return;
  const order = {
    ...raw,
    services: one(raw.services) as { name: string; slug: string } | null,
    profiles: one(raw.profiles) as { whatsapp: string | null; full_name: string | null } | null,
  };

  await admin.from("transactions").insert({
    user_id: p.user_id, type: "order_payment", amount_idr: p.amount_idr,
    reference_id: order.id, reference_type: "order", gateway_ref: p.midtrans_order_id,
    notes: `Pembayaran ${order.order_number} berhasil`,
  });
  await admin.from("notifications").insert({
    user_id: p.user_id, order_id: order.id, channel: "in_app", title: "Pembayaran Berhasil",
    body: `Pesanan ${order.order_number} (${order.services?.name ?? "Layanan"}) sedang diproses.`,
  });
  await sendReceipt(admin, p, `${order.services?.name ?? "Layanan"} — ${order.order_number}`);
  runDetectionPipeline(order.id, order).catch((e) => console.error("[payment] detection pipeline:", e));
}

// ── Gagal / expire / batal ─────────────────────────────────────────────────
async function handleFailure(admin: Admin, p: PaymentRow, outcome: PaymentOutcome) {
  const now = new Date().toISOString();
  const reason = `Midtrans: ${outcome}`;
  if (p.purpose === "produk") {
    const { data } = await admin
      .from("pesanan_produk")
      .update({ status: "dibatalkan", dibatalkan_at: now, alasan_batal: reason })
      .eq("id", p.reference_id)
      .eq("status", "menunggu_pembayaran")
      .eq("midtrans_order_id", p.midtrans_order_id)
      .select("id");
    if (data?.length) await admin.rpc("lepas_stok_pesanan", { p_pesanan_id: p.reference_id });
    return;
  }
  await admin
    .from("orders")
    .update({ status: "dibatalkan", cancelled_at: now, cancel_reason: reason })
    .eq("id", p.reference_id)
    .eq("status", "menunggu_pembayaran")
    .eq("midtrans_order_id", p.midtrans_order_id);
}

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null;
}

/** Email receipt (jika Resend dikonfigurasi). */
async function sendReceipt(admin: Admin, p: PaymentRow, description: string) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) return;
  try {
    const [{ data }, { data: pay }] = await Promise.all([
      admin.auth.admin.getUserById(p.user_id),
      admin.from("payments").select("receipt_number").eq("id", p.id).single(),
    ]);
    const email = data?.user?.email;
    if (!email) return;
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? `https://${BRAND.domain}`).replace(/\/$/, "");
    const receiptNo = pay?.receipt_number ?? p.midtrans_order_id;
    await sendEmail({
      to: email,
      subject: `Receipt ${receiptNo} — ${BRAND.name}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
        <h2 style="color:${BRAND.primaryColor}">Pembayaran Berhasil</h2>
        <p>No. Receipt: <b>${receiptNo}</b><br/>Item: ${escapeHtml(description)}<br/>Total: <b>${formatRupiah(p.amount_idr)}</b></p>
        <p><a href="${appUrl}/receipt/${p.id}" style="background:${BRAND.primaryColor};color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:bold">Lihat Receipt &amp; Konfirmasi via WhatsApp</a></p>
        <p style="color:#888;font-size:12px">Verifikasi: ${appUrl}/verify/${receiptNo}</p></div>`,
    });
  } catch (err) {
    console.error("[payment] email receipt gagal:", err);
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
