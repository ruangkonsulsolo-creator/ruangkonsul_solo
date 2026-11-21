import { NextRequest, NextResponse } from "next/server";
import { getTransactionStatus, verifySignature, type MidtransNotification } from "@/lib/payment/midtrans";
import { applyMidtransStatus } from "@/lib/payment/fulfillment";

export const dynamic = "force-dynamic";

/**
 * Midtrans HTTP Notification (webhook).
 *
 * Set di Midtrans Dashboard → Settings → Payment → Notification URL:
 *   https://<domain>/api/payment/webhook
 *
 * Menangani semua jenis pembayaran (pesanan per-file, paket hemat, booking
 * mentor) lewat tabel `payments`. Lihat lib/payment/fulfillment.ts.
 */
export async function POST(request: NextRequest) {
  let body: MidtransNotification;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!body?.order_id || !body.status_code || !body.gross_amount || !body.transaction_status) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (!verifySignature(body)) {
    // Signature tidak cocok (mis. key berbeda di dashboard baru). Jangan percaya
    // isi body — ambil status resmi langsung dari API Midtrans dengan server key.
    const official = await getTransactionStatus(body.order_id).catch(() => null);
    if (!official || official.order_id !== body.order_id) {
      console.warn("[webhook] Midtrans: invalid signature for order_id:", body.order_id);
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }
    console.warn("[webhook] signature tidak cocok, memakai status resmi API untuk:", body.order_id);
    body = official;
  }

  const result = await applyMidtransStatus(body);

  if (!result.ok && result.error === "payment_not_found") {
    // Mis. tombol "Test notification" di dashboard Midtrans → balas 200 agar tidak di-retry terus
    console.warn("[webhook] order_id tidak dikenal:", body.order_id);
    return NextResponse.json({ data: "ignored — unknown order_id" });
  }

  if (!result.ok) {
    // 500 → Midtrans akan mengirim ulang notifikasi (retry otomatis)
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ data: "ok", outcome: result.outcome, changed: result.changed });
}
