import { NextRequest, NextResponse } from "next/server";
import { verifySignature, type MidtransNotification } from "@/lib/payment/midtrans";
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
    console.warn("[webhook] Midtrans: invalid signature for order_id:", body.order_id);
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
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
