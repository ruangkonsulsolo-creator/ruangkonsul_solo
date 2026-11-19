import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/security/rate-limit";
import { z } from "zod";
import { requireUser, STAFF_ROLES } from "@/lib/auth/require-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTransactionStatus } from "@/lib/payment/midtrans";
import { applyMidtransStatus } from "@/lib/payment/fulfillment";

export const dynamic = "force-dynamic";

const schema = z
  .object({
    payment_id: z.string().uuid().optional(),
    // alternatif: cari pembayaran pending terbaru untuk referensi ini
    purpose: z.enum(["order", "produk"]).optional(),
    reference_id: z.string().uuid().optional(),
  })
  .refine((v) => v.payment_id || (v.purpose && v.reference_id), {
    message: "payment_id atau (purpose + reference_id) wajib diisi.",
  });

/**
 * Sinkronkan status pembayaran langsung dari Midtrans.
 *
 * Dipanggil oleh browser setelah popup Snap ditutup / user kembali ke halaman,
 * sebagai cadangan jika webhook terlambat atau tidak bisa menjangkau server
 * (mis. saat development di localhost). Data diambil server-to-server dari
 * Midtrans, jadi tidak bisa dipalsukan client.
 */
export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, role } = auth.ctx;

  if (!(await rateLimit(`sync:${user.id}`, 60, 40))) {
    return NextResponse.json({ error: "Terlalu banyak permintaan. Coba lagi sebentar." }, { status: 429 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 422 });
  }

  const admin = createAdminClient();
  let query = admin
    .from("payments")
    .select("id, user_id, midtrans_order_id, status, purpose, reference_id")
    .order("created_at", { ascending: false })
    .limit(1);

  if (parsed.data.payment_id) {
    query = query.eq("id", parsed.data.payment_id);
  } else {
    query = query.eq("purpose", parsed.data.purpose!).eq("reference_id", parsed.data.reference_id!);
  }

  // User biasa hanya boleh menyinkronkan pembayarannya sendiri
  if (!STAFF_ROLES.includes(role)) query = query.eq("user_id", user.id);

  const { data: payment } = await query.maybeSingle();
  if (!payment) return NextResponse.json({ error: "Pembayaran tidak ditemukan." }, { status: 404 });

  if (payment.status !== "pending") {
    return NextResponse.json({ data: { status: payment.status, changed: false } });
  }

  const remote = await getTransactionStatus(payment.midtrans_order_id);
  if (!remote) {
    // User belum memilih metode bayar di Snap → transaksi belum tercatat di Midtrans
    return NextResponse.json({ data: { status: "pending", changed: false } });
  }

  const result = await applyMidtransStatus(remote);
  return NextResponse.json({
    data: { status: result.outcome, changed: result.changed, purpose: payment.purpose, reference_id: payment.reference_id },
  });
}
