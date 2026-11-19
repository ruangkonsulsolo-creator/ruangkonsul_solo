import { NextRequest, NextResponse } from "next/server";
import { requireUser, STAFF_ROLES } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { processOrder } from "@/lib/processing/runner";
import { rateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Picu pemrosesan pesanan.
 * - Customer pemilik: hanya jika pesanan macet (aman — runner menolak jika sedang berjalan).
 * - Admin/superadmin: "Proses ulang" (force = reset jumlah percobaan).
 */
export async function POST(request: NextRequest, { params }: { params: { orderId: string } }) {
  const auth = await requireUser();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const isStaff = STAFF_ROLES.includes(auth.ctx.role);

  if (!(await rateLimit(`process:${auth.ctx.user.id}`, 60, isStaff ? 30 : 3))) {
    return NextResponse.json({ error: "Terlalu sering. Coba lagi sebentar." }, { status: 429 });
  }

  const { data: order } = await createAdminClient().from("orders").select("id, user_id").eq("id", params.orderId).maybeSingle();
  if (!order || (!isStaff && order.user_id !== auth.ctx.user.id)) {
    return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const outcome = await processOrder(order.id, { force: isStaff && body?.force === true });
  return NextResponse.json({ data: outcome });
}
