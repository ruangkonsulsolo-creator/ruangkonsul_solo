import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { findPendingOrders, processOrder } from "@/lib/processing/runner";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Cron cadangan: proses pesanan yang belum selesai / gagal (maks 3 percobaan).
 * Vercel Cron mengirim header Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const got = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (!secret || got.length !== expected.length || !timingSafeEqual(Buffer.from(got), Buffer.from(expected))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ids = await findPendingOrders(3);
  const results = [];
  for (const id of ids) results.push({ id, ...(await processOrder(id)) });
  return NextResponse.json({ processed: results.length, results });
}
