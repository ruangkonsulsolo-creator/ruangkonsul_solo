import Link from "next/link";
import { redirect } from "next/navigation";
import { Receipt } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PURPOSE_LABEL, formatDateTimeWIB } from "@/lib/receipt/data";
import { formatRupiah } from "@/lib/utils/format-currency";
import { BRAND } from "@/lib/brand";
import { PREVIEW_MODE, PREVIEW_USER } from "@/lib/utils/preview-mode";
import type { Metadata } from "next";

export const metadata: Metadata = { title: `Receipt Saya | ${BRAND.name}` };

export default async function ReceiptListPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && !PREVIEW_MODE) redirect("/login?next=/dashboard/receipt");

  const { data: payments } = await supabase
    .from("payments")
    .select("id, receipt_number, purpose, amount_idr, paid_at, status")
    .eq("user_id", user?.id ?? PREVIEW_USER.id)
    .in("status", ["paid", "refunded"])
    .order("paid_at", { ascending: false })
    .limit(100);

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Receipt Saya</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Bukti pembayaran resmi untuk semua transaksi lunas.</p>
      </div>
      {(payments ?? []).length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white py-14 text-center">
          <Receipt className="h-10 w-10 text-slate-200" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Belum ada transaksi lunas.</p>
        </div>
      ) : (
        <div className="divide-y rounded-2xl border border-slate-200 bg-white">
          {payments!.map((p) => (
            <Link key={p.id} href={`/receipt/${p.id}`} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50">
              <div>
                <p className="font-mono text-sm font-bold text-slate-900">{p.receipt_number ?? "-"}</p>
                <p className="text-xs text-muted-foreground">
                  {PURPOSE_LABEL[p.purpose as keyof typeof PURPOSE_LABEL]} · {formatDateTimeWIB(p.paid_at)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900">{formatRupiah(p.amount_idr)}</p>
                <p className="text-xs font-semibold text-[#8B0000]">{p.status === "refunded" ? "Refund" : "Lihat →"}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
