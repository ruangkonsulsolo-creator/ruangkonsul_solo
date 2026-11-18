import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { runDetectionPipeline } from "@/lib/detection/pipeline";
import { sendWhatsApp, waTemplates } from "@/lib/notification/whatsapp";
import { sendEmail } from "@/lib/notification/email";
import { formatRupiah } from "@/lib/utils/format-currency";
import { BRAND } from "@/lib/brand";
import { classifyStatus, type MidtransNotification, type PaymentOutcome } from "./midtrans";
import { creditReferralIfFirstPurchase } from "./referral";

type Admin = ReturnType<typeof createAdminClient>;

interface PaymentRow {
  id: string;
  midtrans_order_id: string;
  user_id: string;
  purpose: "order" | "package" | "booking";
  reference_id: string;
  amount_idr: number;
  status: string;
}

export interface ApplyResult {
  ok: boolean;
  outcome: PaymentOutcome;
  /** true jika update ini yang mengubah status (bukan duplikat notifikasi) */
  changed: boolean;
  purpose?: PaymentRow["purpose"];
  referenceId?: string;
  error?: string;
}

/**
 * Terapkan status Midtrans ke database. Idempotent — aman dipanggil berkali-kali
 * (Midtrans bisa mengirim notifikasi yang sama lebih dari sekali, dan endpoint
 * /api/payment/status juga memanggil fungsi ini).
 *
 * Panggil HANYA dengan data yang sudah terverifikasi (signature valid atau
 * hasil GET status langsung dari Midtrans).
 */
export async function applyMidtransStatus(n: MidtransNotification): Promise<ApplyResult> {
  const admin = createAdminClient();
  const outcome = classifyStatus(n.transaction_status, n.fraud_status);

  let payment = await findPayment(admin, n.order_id);
  if (!payment) payment = await adoptLegacyOrder(admin, n);
  if (!payment) return { ok: false, outcome, changed: false, error: "payment_not_found" };

  // Midtrans gross_amount berbentuk "35000.00"
  if (Math.round(Number(n.gross_amount)) !== payment.amount_idr) {
    console.error(
      `[payment] gross_amount mismatch ${n.order_id}: midtrans=${n.gross_amount} db=${payment.amount_idr}`
    );
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
    const { data } = await admin
      .from("payments")
      .update({ ...meta, status: "refunded" })
      .eq("id", payment.id)
      .eq("status", "paid")
      .select("id");
    return { ...base, changed: !!data?.length };
  }

  // Transisi final: hanya dari 'pending' → klaim atomik, mencegah fulfilment ganda
  const { data: claimed } = await admin
    .from("payments")
    .update({
      ...meta,
      status: outcome,
      paid_at: outcome === "paid" ? new Date().toISOString() : null,
    })
    .eq("id", payment.id)
    .eq("status", "pending")
    .select("id");

  if (!claimed || claimed.length === 0) {
    return { ...base, changed: false };
  }

  try {
    if (outcome === "paid") {
      await fulfil(admin, payment);
    } else {
      await handleFailure(admin, payment, outcome);
    }
  } catch (err) {
    console.error(`[payment] fulfilment error ${payment.midtrans_order_id}:`, err);
    // Kembalikan ke 'pending' agar retry webhook Midtrans (atau /api/payment/status)
    // bisa memproses ulang. Langkah fulfilment dibuat aman diulang (cek status target).
    await admin
      .from("payments")
      .update({ status: "pending", paid_at: null })
      .eq("id", payment.id)
      .eq("status", outcome);
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

/** Pesanan lama (sebelum tabel payments ada) — buatkan baris payment on-the-fly. */
async function adoptLegacyOrder(admin: Admin, n: MidtransNotification): Promise<PaymentRow | null> {
  const { data: order } = await admin
    .from("orders")
    .select("id, user_id, price_idr")
    .eq("midtrans_order_id", n.order_id)
    .maybeSingle();
  if (!order || !order.price_idr) return null;

  const { data } = await admin
    .from("payments")
    .upsert(
      {
        midtrans_order_id: n.order_id,
        user_id: order.user_id,
        purpose: "order",
        reference_id: order.id,
        amount_idr: order.price_idr,
        status: "pending",
      },
      { onConflict: "midtrans_order_id", ignoreDuplicates: false }
    )
    .select("id, midtrans_order_id, user_id, purpose, reference_id, amount_idr, status")
    .single();
  return (data as PaymentRow | null) ?? null;
}

// ─── Fulfilment per jenis pembayaran ─────────────────────────────────────────

async function fulfil(admin: Admin, p: PaymentRow) {
  switch (p.purpose) {
    case "order":
      return fulfilOrder(admin, p);
    case "package":
      return fulfilPackage(admin, p);
    case "booking":
      return fulfilBooking(admin, p);
  }
}

async function fulfilOrder(admin: Admin, p: PaymentRow) {
  const now = new Date().toISOString();

  // Hanya pesanan yang masih menunggu pembayaran — atau yang otomatis dibatalkan
  // sistem karena transaksi Midtrans (bukan dibatalkan admin) — dipindah ke 'diproses'.
  const { data: current } = await admin
    .from("orders")
    .select("status, cancel_reason")
    .eq("id", p.reference_id)
    .single();
  const eligible =
    current &&
    (current.status === "menunggu_pembayaran" ||
      (current.status === "dibatalkan" && String(current.cancel_reason ?? "").startsWith("Midtrans")));
  if (!eligible) return;

  // Update optimistik: hanya berhasil jika status belum berubah sejak dibaca
  const { data: updated, error: updateError } = await admin
    .from("orders")
    .update({
      status: "diproses",
      paid_at: now,
      midtrans_order_id: p.midtrans_order_id,
      cancelled_at: null,
      cancel_reason: null,
    })
    .eq("id", p.reference_id)
    .eq("status", current.status)
    .select(
      "id, user_id, order_number, file_id, services ( name, slug ), profiles:profiles!orders_user_id_fkey ( whatsapp, full_name )"
    );

  if (updateError) throw new Error(`Gagal update order: ${updateError.message}`);
  const orderRaw = updated?.[0];
  if (!orderRaw) return; // sudah diproses sebelumnya / dibatalkan admin

  const order = {
    ...orderRaw,
    services: one(orderRaw.services) as { name: string; slug: string } | null,
    profiles: one(orderRaw.profiles) as { whatsapp: string | null; full_name: string | null } | null,
  };

  await admin.from("transactions").insert({
    user_id: p.user_id,
    type: "order_payment",
    amount_idr: p.amount_idr,
    reference_id: order.id,
    reference_type: "order",
    gateway_ref: p.midtrans_order_id,
    notes: `Pembayaran ${order.order_number} berhasil`,
  });

  await admin.from("notifications").insert({
    user_id: p.user_id,
    order_id: order.id,
    channel: "in_app",
    title: "Pembayaran Berhasil",
    body: `Pesanan ${order.order_number} (${order.services?.name ?? "Layanan"}) sedang diproses.`,
  });

  if (order.profiles?.whatsapp) {
    sendWhatsApp({ to: order.profiles.whatsapp, message: waTemplates.orderReceived(order.order_number) }).catch(
      (e) => console.error("[payment] WA gagal:", e)
    );
  }

  await sendReceipt(admin, p, `${order.services?.name ?? "Layanan"} — ${order.order_number}`);
  await creditReferralIfFirstPurchase({
    userId: p.user_id,
    amountIdr: p.amount_idr,
    orderId: order.id,
    label: `pesanan ${order.order_number}`,
  });

  // Pipeline deteksi otomatis (hanya layanan plagiasi). Tidak di-await agar
  // webhook Midtrans cepat mendapat HTTP 200.
  runDetectionPipeline(order.id, order).catch((err) =>
    console.error("[payment] detection pipeline error:", err)
  );
}

async function fulfilPackage(admin: Admin, p: PaymentRow) {
  const { data: pkg } = await admin
    .from("quota_packages")
    .select("id, name, service_id, quota_amount, validity_days, services(name)")
    .eq("id", p.reference_id)
    .single();

  if (!pkg) throw new Error(`Paket ${p.reference_id} tidak ditemukan`);

  // Idempoten: kalau kuota untuk payment ini sudah dibuat (retry setelah error), jangan dobel
  const { data: existingQuota } = await admin.from("user_quotas").select("id").eq("payment_id", p.id).maybeSingle();
  if (existingQuota) return;

  const expiresAt = new Date(Date.now() + pkg.validity_days * 86_400_000).toISOString();

  const { data: quota, error } = await admin
    .from("user_quotas")
    .insert({
      user_id: p.user_id,
      package_id: pkg.id,
      service_id: pkg.service_id,
      quota_total: pkg.quota_amount,
      quota_remaining: pkg.quota_amount,
      expires_at: expiresAt,
      payment_id: p.id,
    })
    .select("id")
    .single();

  if (error || !quota) throw new Error(`Gagal membuat kuota: ${error?.message}`);

  await admin.from("payments").update({ fulfilled_ref_id: quota.id }).eq("id", p.id);

  const serviceName = (one(pkg.services) as { name: string } | null)?.name ?? "Layanan";

  await admin.from("transactions").insert({
    user_id: p.user_id,
    type: "package_purchase",
    amount_idr: p.amount_idr,
    reference_id: pkg.id,
    reference_type: "quota_package",
    gateway_ref: p.midtrans_order_id,
    notes: `Pembelian ${pkg.name} (${pkg.quota_amount}x ${serviceName})`,
  });

  await admin.from("notifications").insert({
    user_id: p.user_id,
    channel: "in_app",
    title: "Paket Aktif 🎉",
    body: `${pkg.name}: ${pkg.quota_amount}x ${serviceName}, berlaku ${pkg.validity_days} hari.`,
  });

  await sendReceipt(admin, p, `${pkg.name} — ${pkg.quota_amount}x ${serviceName}`);
  await creditReferralIfFirstPurchase({
    userId: p.user_id,
    amountIdr: p.amount_idr,
    label: `pembelian ${pkg.name}`,
  });
}

async function fulfilBooking(admin: Admin, p: PaymentRow) {
  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await admin
    .from("bookings")
    .update({ status: "confirmed", paid_at: now, confirmed_at: now })
    .eq("id", p.reference_id)
    .eq("status", "pending")
    .select(
      "id, booking_number, mentor_id, booking_slots(slot_date, slot_start, slot_end), mentor_profiles(user_id)"
    );

  if (updateError) throw new Error(`Gagal update booking: ${updateError.message}`);
  const booking = updated?.[0];
  if (!booking) {
    // Booking sudah dibatalkan (mis. slot diambil orang lain) padahal user membayar.
    // Tandai untuk ditindaklanjuti admin (refund manual).
    await admin.from("transactions").insert({
      user_id: p.user_id,
      type: "booking_payment",
      amount_idr: p.amount_idr,
      reference_id: p.reference_id,
      reference_type: "booking",
      gateway_ref: p.midtrans_order_id,
      notes: "PERLU REVIEW: pembayaran diterima tetapi booking tidak lagi pending (refund/jadwal ulang).",
    });
    return;
  }

  const slot = one(booking.booking_slots) as { slot_date: string; slot_start: string; slot_end: string } | null;
  const mentorUserId = (one(booking.mentor_profiles) as { user_id: string } | null)?.user_id;
  const when = slot ? `${slot.slot_date} ${slot.slot_start.slice(0, 5)}–${slot.slot_end.slice(0, 5)} WIB` : "";

  await admin.from("transactions").insert({
    user_id: p.user_id,
    type: "booking_payment",
    amount_idr: p.amount_idr,
    reference_id: booking.id,
    reference_type: "booking",
    gateway_ref: p.midtrans_order_id,
    notes: `Pembayaran booking ${booking.booking_number}`,
  });

  await admin.from("notifications").insert([
    {
      user_id: p.user_id,
      channel: "in_app",
      title: "Booking Terkonfirmasi",
      body: `Sesi bimbingan ${booking.booking_number} terkonfirmasi untuk ${when}.`,
    },
    ...(mentorUserId
      ? [
          {
            user_id: mentorUserId,
            channel: "in_app",
            title: "Booking Baru",
            body: `Ada sesi baru ${booking.booking_number} pada ${when}.`,
          },
        ]
      : []),
  ]);

  await sendReceipt(admin, p, `Sesi bimbingan ${booking.booking_number} (${when})`);
  await creditReferralIfFirstPurchase({
    userId: p.user_id,
    amountIdr: p.amount_idr,
    label: `booking ${booking.booking_number}`,
  });
}

// ─── Gagal / expire / batal ──────────────────────────────────────────────────

async function handleFailure(admin: Admin, p: PaymentRow, outcome: PaymentOutcome) {
  const reason = `Pembayaran ${outcome === "expired" ? "kedaluwarsa" : outcome === "cancelled" ? "dibatalkan" : "gagal"}`;
  const now = new Date().toISOString();

  if (p.purpose === "order") {
    // Hanya batalkan jika transaksi ini adalah transaksi AKTIF pesanan
    // (bukan transaksi lama yang sudah diganti lewat "Bayar Ulang").
    const { data: cancelled, error: cancelError } = await admin
      .from("orders")
      .update({ status: "dibatalkan", cancelled_at: now, cancel_reason: `Midtrans: ${outcome}` })
      .eq("id", p.reference_id)
      .eq("status", "menunggu_pembayaran")
      .eq("midtrans_order_id", p.midtrans_order_id)
      .select("id, order_number, file_id");

    if (cancelError) throw new Error(`Gagal membatalkan order: ${cancelError.message}`);
    const order = cancelled?.[0];
    if (order) {
      // FR-P04: file dihapus jika pembayaran gagal/expired
      const { data: file } = await admin
        .from("uploaded_files")
        .select("storage_path")
        .eq("id", order.file_id)
        .single();
      if (file?.storage_path) {
        await admin.storage.from("documents").remove([file.storage_path]).catch(() => undefined);
      }
      await admin.from("uploaded_files").update({ is_deleted: true }).eq("id", order.file_id);

      await admin.from("notifications").insert({
        user_id: p.user_id,
        order_id: order.id,
        channel: "in_app",
        title: reason,
        body: `Pesanan ${order.order_number} dibatalkan karena ${reason.toLowerCase()}.`,
      });
    }
  }

  if (p.purpose === "booking") {
    // Membebaskan slot (unique index hanya berlaku untuk status aktif)
    await admin
      .from("bookings")
      .update({ status: "cancelled", cancelled_at: now, cancel_reason: reason })
      .eq("id", p.reference_id)
      .eq("status", "pending")
      .eq("midtrans_order_id", p.midtrans_order_id);
  }
  // purpose 'package': tidak ada yang perlu di-rollback
}

// ─── Util ────────────────────────────────────────────────────────────────────

function one<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

/** FR-P05: kirim bukti pembayaran via email (jika Resend dikonfigurasi). */
async function sendReceipt(admin: Admin, p: PaymentRow, description: string) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) return;
  try {
    const { data } = await admin.auth.admin.getUserById(p.user_id);
    const email = data?.user?.email;
    if (!email) return;
    await sendEmail({
      to: email,
      subject: `Bukti Pembayaran ${p.midtrans_order_id} — ${BRAND.name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
          <h2 style="color:${BRAND.primaryColor}">Pembayaran Berhasil</h2>
          <p>Terima kasih! Pembayaran kamu sudah kami terima.</p>
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tr><td style="padding:6px 0;color:#666">No. Transaksi</td><td><b>${p.midtrans_order_id}</b></td></tr>
            <tr><td style="padding:6px 0;color:#666">Item</td><td>${escapeHtml(description)}</td></tr>
            <tr><td style="padding:6px 0;color:#666">Total</td><td><b>${formatRupiah(p.amount_idr)}</b></td></tr>
            <tr><td style="padding:6px 0;color:#666">Tanggal</td><td>${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB</td></tr>
          </table>
          <p style="margin-top:24px;color:#888;font-size:12px">${BRAND.name} · ${BRAND.domain}</p>
        </div>`,
    });
  } catch (err) {
    console.error("[payment] email bukti bayar gagal:", err);
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
