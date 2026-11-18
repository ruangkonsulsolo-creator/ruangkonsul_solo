import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { startPayment, getCustomerDetails, findReusablePayment } from "@/lib/payment/checkout";

export const dynamic = "force-dynamic";

const schema = z.object({ package_id: z.string().uuid() });

/** Beli paket hemat (bundle kuota) via Midtrans. Kuota diberikan oleh webhook. */
export async function POST(request: NextRequest) {
  const auth = await requireUser(["user"]);
  if (!auth.ok) {
    const msg = auth.status === 403 ? "Hanya akun customer yang bisa membeli paket." : auth.error;
    return NextResponse.json({ error: msg }, { status: auth.status });
  }
  const { user } = auth.ctx;

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Paket tidak valid." }, { status: 422 });

  const admin = createAdminClient();
  const { data: pkg } = await admin
    .from("quota_packages")
    .select("id, name, price_idr, quota_amount, validity_days, services(name, is_active)")
    .eq("id", parsed.data.package_id)
    .eq("is_active", true)
    .single();

  if (!pkg) return NextResponse.json({ error: "Paket tidak ditemukan atau sudah tidak dijual." }, { status: 404 });

  const svc = (Array.isArray(pkg.services) ? pkg.services[0] : pkg.services) as
    | { name: string; is_active: boolean }
    | null;
  if (svc && svc.is_active === false) {
    return NextResponse.json({ error: "Layanan untuk paket ini sedang tidak aktif." }, { status: 400 });
  }

  // Klik "Beli" dua kali → kembalikan transaksi yang sama
  const reusable = await findReusablePayment("package", pkg.id, user.id);
  if (reusable?.snap_token) {
    return NextResponse.json({ data: { snap_token: reusable.snap_token, payment_id: reusable.id } });
  }

  try {
    const payment = await startPayment({
      purpose: "package",
      referenceId: pkg.id,
      displayRef: pkg.name,
      userId: user.id,
      amountIdr: pkg.price_idr,
      items: [
        {
          id: `pkg-${pkg.id.slice(0, 8)}`,
          price: pkg.price_idr,
          quantity: 1,
          name: `${pkg.name} - ${pkg.quota_amount}x ${svc?.name ?? "Layanan"}`,
        },
      ],
      customer: await getCustomerDetails(user.id, user.email),
      finishPath: "/dashboard/paket-saya?paid=1",
    });

    return NextResponse.json({ data: { snap_token: payment.snapToken, payment_id: payment.paymentId } });
  } catch (err) {
    console.error("[payment/package] error:", err);
    return NextResponse.json({ error: "Gagal membuat transaksi pembayaran. Coba lagi." }, { status: 502 });
  }
}
