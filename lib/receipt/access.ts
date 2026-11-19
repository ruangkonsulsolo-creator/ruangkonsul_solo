import "server-only";
import { requireUser, STAFF_ROLES } from "@/lib/auth/require-user";
import { getReceipt, type ReceiptData } from "./data";

/** Receipt hanya boleh dibuka pemiliknya atau admin/superadmin. */
export async function getReceiptForViewer(
  paymentId: string
): Promise<{ ok: true; receipt: ReceiptData } | { ok: false; status: number; error: string }> {
  if (!/^[0-9a-f-]{36}$/i.test(paymentId)) return { ok: false, status: 404, error: "Receipt tidak ditemukan." };
  const auth = await requireUser();
  if (!auth.ok) return { ok: false, status: auth.status, error: auth.error };
  const receipt = await getReceipt(paymentId);
  if (!receipt) return { ok: false, status: 404, error: "Receipt tidak ditemukan." };
  if (receipt.userId !== auth.ctx.user.id && !STAFF_ROLES.includes(auth.ctx.role)) {
    return { ok: false, status: 404, error: "Receipt tidak ditemukan." };
  }
  return { ok: true, receipt };
}
