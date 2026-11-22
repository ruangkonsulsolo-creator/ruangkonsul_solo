import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { runDetectionPipeline } from "@/lib/detection/pipeline";
import { sendWhatsApp, waTemplates } from "@/lib/notification/whatsapp";
import { SEMUA_SLUG_MANUAL } from "@/lib/periksa/manual";
import { kreditReferral } from "@/lib/referral";
import { sendEmail } from "@/lib/notification/email";
import { formatRupiah } from "@/lib/utils/format-currency";
import { BRAND } from "@/lib/brand";
import { classifyStatus, type MidtransNotification, type PaymentOutcome } from "./midtrans";
import { pastikanPercakapan } from "@/lib/chat/pastikan-percakapan";

type Admin = ReturnType<typeof createAdminClient>;

interface PaymentRow {
  id: string;
  midtrans_order_id: string;
  user_id: string;
  purpose: "order" | "produk" | "booking" | "saldo";
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
  if (p.purpose === "produk") await fulfilProduk(admin, p);
  else if (p.purpose === "booking") await fulfilBooking(admin, p);
  else if (p.purpose === "saldo") await fulfilSaldo(admin, p);
  else await fulfilOrder(admin, p);
  // Komisi referral dari pembayaran lunas pertama (idempoten di database).
  await kreditReferral(p.user_id, p.amount_idr).catch((e) => console.error("[payment] referral:", e));
}

// ── Isi saldo (paket_saldo) ────────────────────────────────────────────────
async function fulfilSaldo(admin: Admin, p: PaymentRow) {
  // Jumlah saldo diambil dari snapshot saat transaksi dibuat, bukan dari
  // paket sekarang — admin bisa mengubah paket setelah customer membayar.
  const { data: pay } = await admin.from("payments").select("item_snapshot").eq("id", p.id).maybeSingle();
  const item = (Array.isArray(pay?.item_snapshot) ? pay!.item_snapshot[0] : null) as
    | { saldo_idr?: number; name?: string }
    | null;
  const snap = { saldo_idr: item?.saldo_idr, nama: item?.name };
  const saldo = Number(snap.saldo_idr);
  if (!Number.isFinite(saldo) || saldo <= 0) throw new Error("Snapshot saldo tidak valid");

  const { data: saldoAkhir, error } = await admin.rpc("tambah_saldo", {
    p_user_id: p.user_id,
    p_jumlah: Math.round(saldo),
    p_keterangan: `Isi saldo: ${snap.nama ?? "paket"} (${p.midtrans_order_id})`,
    p_ref_id: p.id,
  });
  if (error) throw new Error(`Gagal menambah saldo: ${error.message}`);

  await admin.from("transactions").insert({
    user_id: p.user_id,
    type: "order_payment",
    amount_idr: p.amount_idr,
    reference_id: p.id,
    reference_type: null,
    gateway_ref: p.midtrans_order_id,
    notes: `Isi saldo ${snap.nama ?? ""}: +${saldo}`,
  });
  await admin.from("notifications").insert({
    user_id: p.user_id,
    channel: "in_app",
    title: "Saldo Bertambah",
    body: `Saldo cek naskah bertambah Rp${saldo.toLocaleString("id-ID")}. Saldo sekarang Rp${Number(saldoAkhir ?? 0).toLocaleString("id-ID")}.`,
  });
  await sendReceipt(admin, p, `Isi saldo ${snap.nama ?? ""} (+Rp${saldo.toLocaleString("id-ID")})`.trim());
}

// ── Sesi mentor (booking slot) ─────────────────────────────────────────────
const jamWib = new Intl.DateTimeFormat("id-ID", {
  weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Jakarta",
});

async function fulfilBooking(admin: Admin, p: PaymentRow) {
  const now = new Date().toISOString();
  const { data: updated, error } = await admin
    .from("bookings")
    .update({ status: "confirmed", paid_at: now, confirmed_at: now, payment_method: "midtrans" })
    .eq("id", p.reference_id)
    .eq("status", "pending")
    .is("paid_at", null)
    .select("id, booking_number, whatsapp, notes, mentor_id, booking_slots:booking_slots!bookings_slot_id_fkey ( slot_date, slot_start ), mentor_profiles ( display_name, user_id )");
  if (error) throw new Error(`Gagal update booking: ${error.message}`);
  const raw = updated?.[0];
  if (!raw) {
    // Booking sudah dibatalkan (mis. lewat batas waktu) tapi uang masuk → perlu tindakan admin.
    const { data: b } = await admin.from("bookings").select("booking_number, status").eq("id", p.reference_id).maybeSingle();
    if (b && b.status === "cancelled") {
      console.error(`[payment] booking ${b.booking_number} sudah dibatalkan tapi pembayaran ${p.midtrans_order_id} lunas — perlu reschedule/refund manual.`);
      await admin.from("notifications").insert({
        user_id: p.user_id,
        channel: "in_app",
        title: "Pembayaran diterima — jadwal perlu diatur ulang",
        body: `Pembayaran untuk ${b.booking_number} masuk setelah slot dilepas. Admin akan menghubungi kamu untuk memilih jadwal pengganti.`,
      });
    }
    return;
  }

  const slot = one(raw.booking_slots) as { slot_date: string; slot_start: string } | null;
  const mentor = one(raw.mentor_profiles) as { display_name: string | null; user_id: string | null } | null;
  const waktu = slot
    ? `${jamWib.format(new Date(`${slot.slot_date}T00:00:00+07:00`))}, ${slot.slot_start.slice(0, 5).replace(":", ".")} WIB`
    : "";
  const paket = /^Paket: (.+)$/m.exec((raw as { notes?: string | null }).notes ?? "")?.[1];
  const item = `${paket ?? "Sesi bimbingan"}${mentor?.display_name ? ` dengan ${mentor.display_name}` : ""}${waktu ? ` — ${waktu}` : ""}`;

  await admin.from("transactions").insert({
    user_id: p.user_id,
    type: "order_payment",
    amount_idr: p.amount_idr,
    reference_id: raw.id,
    reference_type: null,
    gateway_ref: p.midtrans_order_id,
    notes: `Pembayaran booking ${raw.booking_number}: ${item}`,
  });
  await admin.from("notifications").insert({
    user_id: p.user_id,
    channel: "in_app",
    title: "Jadwal Bimbingan Terkonfirmasi",
    body: `${raw.booking_number} lunas. ${item}. Link sesi akan dikirim sebelum jadwal dimulai.`,
  });
  // Mentor langsung muncul di menu Chat Mentor customer.
  if (raw.mentor_id) await pastikanPercakapan(admin, raw.mentor_id as string, p.user_id);
  if (mentor?.user_id) {
    await admin.from("notifications").insert({
      user_id: mentor.user_id,
      channel: "in_app",
      title: "Sesi Baru Terjadwal",
      body: `${raw.booking_number} — ${waktu}. Customer sudah membayar.`,
    });
  }
  if (raw.whatsapp) {
    sendWhatsApp({
      to: raw.whatsapp,
      message: `✅ *${BRAND.name}* — Pembayaran *${raw.booking_number}* diterima. ${item}. Link sesi akan kami kirim sebelum jadwal dimulai.`,
    }).catch(() => undefined);
  }
  await sendReceipt(admin, p, item);
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
  const kolom =
    "id, user_id, order_number, file_id, services ( name, slug ), profiles:profiles!orders_user_id_fkey ( whatsapp, full_name )";
  const now = new Date().toISOString();
  const { data: updated, error } = await admin
    .from("orders")
    .update({ status: "diproses", paid_at: now })
    .eq("id", p.reference_id)
    .eq("status", "menunggu_pembayaran")
    .select(kolom);
  if (error) throw new Error(`Gagal update order: ${error.message}`);
  if (!updated?.[0]) return;

  // Pesanan multi-file: anggota grup ikut lunas dengan pembayaran yang sama.
  const { data: anggota, error: eGrup } = await admin
    .from("orders")
    .update({ status: "diproses", paid_at: now })
    .eq("grup_bayar", p.reference_id)
    .neq("id", p.reference_id)
    .eq("status", "menunggu_pembayaran")
    .select(kolom);
  if (eGrup && !eGrup.message.includes("grup_bayar")) console.error("[payment] grup order:", eGrup.message);

  const semua = [...updated, ...(anggota ?? [])].map((raw) => ({
    ...raw,
    services: one(raw.services) as { name: string; slug: string } | null,
    profiles: one(raw.profiles) as { whatsapp: string | null; full_name: string | null } | null,
  }));
  const order = semua[0];
  const tambahan = semua.length > 1 ? ` (+${semua.length - 1} file)` : "";

  await admin.from("transactions").insert({
    user_id: p.user_id, type: "order_payment", amount_idr: p.amount_idr,
    reference_id: order.id, reference_type: "order", gateway_ref: p.midtrans_order_id,
    notes: `Pembayaran ${order.order_number}${tambahan} berhasil`,
  });
  await admin.from("notifications").insert(
    semua.map((o) => ({
      user_id: p.user_id, order_id: o.id, channel: "in_app", title: "Pembayaran Berhasil",
      body: `Pesanan ${o.order_number} (${o.services?.name ?? "Layanan"}) sedang diproses.`,
    }))
  );
  await sendReceipt(admin, p, `${order.services?.name ?? "Layanan"} — ${order.order_number}${tambahan}`);
  // Laporan manual (Turnitin/DrillBit): kabari customer sekali untuk satu pembayaran.
  if ((SEMUA_SLUG_MANUAL as readonly string[]).includes(order.services?.slug ?? "")) {
    void sendWhatsApp({
      to: order.profiles?.whatsapp,
      message: waTemplates.orderReceived(`${order.order_number}${tambahan}`, order.services?.name ?? "Pesanan"),
    });
  }
  for (const o of semua) {
    runDetectionPipeline(o.id, o).catch((e) => console.error("[payment] detection pipeline:", e));
  }
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
  if (p.purpose === "saldo") return; // tidak ada pesanan yang perlu dibatalkan
  if (p.purpose === "booking") {
    // status → cancelled melepas slot (trigger sync_slot_booked_flag)
    await admin
      .from("bookings")
      .update({ status: "cancelled", cancelled_at: now, cancel_reason: reason })
      .eq("id", p.reference_id)
      .eq("status", "pending")
      .is("paid_at", null)
      .eq("midtrans_order_id", p.midtrans_order_id);
    return;
  }
  const { data: batal } = await admin
    .from("orders")
    .update({ status: "dibatalkan", cancelled_at: now, cancel_reason: reason })
    .eq("id", p.reference_id)
    .eq("status", "menunggu_pembayaran")
    .eq("midtrans_order_id", p.midtrans_order_id)
    .select("id");
  if (batal?.length) {
    // Anggota pesanan multi-file ikut dibatalkan (abaikan bila kolom belum ada).
    await admin
      .from("orders")
      .update({ status: "dibatalkan", cancelled_at: now, cancel_reason: reason })
      .eq("grup_bayar", p.reference_id)
      .eq("status", "menunggu_pembayaran");
  }
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
