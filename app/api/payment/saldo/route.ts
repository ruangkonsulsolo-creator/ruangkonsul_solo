import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/require-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { startPayment, getCustomerDetails, findReusablePayment } from "@/lib/payment/checkout";
import { rateLimit } from "@/lib/security/rate-limit";
import { getTransactionStatus } from "@/lib/payment/midtrans";
import { applyMidtransStatus } from "@/lib/payment/fulfillment";

/**
 * Pembayaran saldo yang sudah lunas di Midtrans tapi belum tercatat (webhook
 * terlambat/tidak sampai, atau popup ditutup sebelum sinkron). Disinkronkan
 * dulu sebelum menagih lagi, supaya customer tidak bayar dua kali.
 */
async function pulihkanSaldoTertunda(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const sejak = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data } = await admin
    .from("payments")
    .select("midtrans_order_id")
    .eq("user_id", userId)
    .eq("purpose", "saldo")
    .eq("status", "pending")
    .gte("created_at", sejak)
    .order("created_at", { ascending: false })
    .limit(5);
  let ada = false;
  for (const p of data ?? []) {
    const remote = await getTransactionStatus(p.midtrans_order_id).catch(() => null);
    if (!remote) continue;
    const r = await applyMidtransStatus(remote).catch(() => null);
    if (r?.outcome === "paid") ada = true;
  }
  return ada;
}

const Body = z.union([
  z.object({ paket_id: z.string().uuid() }),
  // Bayar langsung sebesar kekurangan biaya cek naskah (tanpa memilih paket).
  z.object({ nominal: z.number().int().min(1000).max(5_000_000) }),
]);

/**
 * Beli paket isi saldo → Snap QRIS. Saldo ditambahkan oleh webhook / sinkron
 * status setelah lunas (fulfilSaldo), bukan di sini.
 */
export async function POST(req: NextRequest) {
  // Tamu boleh membayar kekurangan saldo cek naskah.
  const auth = await requireUser(undefined, { tamu: true });
  if (!auth.ok) return NextResponse.json({ error: auth.error, action: "login" }, { status: auth.status });
  const { user } = auth.ctx;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Paket tidak valid." }, { status: 422 });

  if (!(await rateLimit(`saldo:${user.id}`, 60, 6))) {
    return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi sebentar." }, { status: 429 });
  }

  if ("nominal" in parsed.data) {
    if (await pulihkanSaldoTertunda(user.id)) {
      return NextResponse.json({ data: { sudah_lunas: true } });
    }
    const nominal = Math.ceil(parsed.data.nominal / 500) * 500;
    try {
      const payment = await startPayment({
        purpose: "saldo",
        referenceId: crypto.randomUUID(),
        displayRef: `CEK${nominal}`,
        userId: user.id,
        amountIdr: nominal,
        items: [{ id: "saldo-cek", price: nominal, quantity: 1, name: "Saldo cek naskah" }],
        itemSnapshot: [{ id: "saldo-cek", price: nominal, quantity: 1, name: "Saldo cek naskah (bayar langsung)", saldo_idr: nominal }],
        customer: await getCustomerDetails(user.id, user.email),
        finishPath: "/",
        expiryMinutes: 30,
      });
      return NextResponse.json({ data: { payment_id: payment.paymentId, snap_token: payment.snapToken, nominal } });
    } catch (err) {
      console.error("[payment/saldo] Midtrans error:", err);
      return NextResponse.json({ error: "Gagal membuat transaksi pembayaran. Coba lagi." }, { status: 502 });
    }
  }

  // Harga & saldo dari DB, tidak pernah dari klien.
  const admin = createAdminClient();
  const { data: paket } = await admin
    .from("paket_saldo")
    .select("id, nama, harga_idr, saldo_idr, is_active")
    .eq("id", parsed.data.paket_id)
    .maybeSingle();
  if (!paket || !paket.is_active) return NextResponse.json({ error: "Paket tidak tersedia." }, { status: 404 });

  // Popup tertutup lalu klik lagi → pakai transaksi yang sama.
  const ada = await findReusablePayment("saldo", paket.id, user.id);
  if (ada?.snap_token) {
    return NextResponse.json({ data: { payment_id: ada.id, snap_token: ada.snap_token } });
  }

  try {
    const payment = await startPayment({
      purpose: "saldo",
      referenceId: paket.id,
      displayRef: paket.nama,
      userId: user.id,
      amountIdr: paket.harga_idr,
      items: [{ id: `saldo-${paket.id.slice(0, 8)}`, price: paket.harga_idr, quantity: 1, name: `Isi ${paket.nama}` }],
      itemSnapshot: [
        { id: `saldo-${paket.id.slice(0, 8)}`, price: paket.harga_idr, quantity: 1, name: paket.nama, saldo_idr: paket.saldo_idr },
      ],
      customer: await getCustomerDetails(user.id, user.email),
      finishPath: "/dashboard/isi-saldo",
      expiryMinutes: 60,
    });
    return NextResponse.json({ data: { payment_id: payment.paymentId, snap_token: payment.snapToken } });
  } catch (err) {
    console.error("[payment/saldo] Midtrans error:", err);
    return NextResponse.json({ error: "Gagal membuat transaksi pembayaran. Coba lagi." }, { status: 502 });
  }
}
