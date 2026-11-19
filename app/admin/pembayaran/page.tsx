import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BRAND } from "@/lib/brand";
import { formatRupiah } from "@/lib/utils/format-currency";
import { requirePageRole } from "@/lib/auth/page-guard";
import { PaymentSyncButton } from "@/components/admin/PaymentSyncButton";
import type { Metadata } from "next";

export const metadata: Metadata = { title: `Pembayaran | Admin ${BRAND.name}` };

const STATUS: Record<string, { label: string; variant: "success" | "warning" | "info" | "destructive" | "secondary" }> = {
  pending:   { label: "Pending",     variant: "warning" },
  paid:      { label: "Lunas",       variant: "success" },
  failed:    { label: "Gagal",       variant: "destructive" },
  expired:   { label: "Kedaluwarsa", variant: "secondary" },
  cancelled: { label: "Dibatalkan",  variant: "secondary" },
  refunded:  { label: "Refund",      variant: "info" },
};

const PURPOSE: Record<string, string> = { order: "Pesanan", package: "Paket Hemat", booking: "Booking Mentor" };

export default async function AdminPembayaranPage({
  searchParams,
}: { searchParams: { status?: string; purpose?: string; page?: string } }) {
  await requirePageRole(["admin", "superadmin"]);
  const supabase = createClient();
  const pageSize = 25;
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));

  let query = supabase
    .from("payments")
    .select("id, receipt_number, midtrans_order_id, purpose, amount_idr, status, payment_type, paid_at, created_at, profiles(full_name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (searchParams.status && STATUS[searchParams.status]) query = query.eq("status", searchParams.status);
  if (searchParams.purpose && PURPOSE[searchParams.purpose]) query = query.eq("purpose", searchParams.purpose);

  const [{ data: payments, count }, { data: paidToday }] = await Promise.all([
    query,
    supabase
      .from("payments")
      .select("amount_idr")
      .eq("status", "paid")
      .gte("paid_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
  ]);

  const revenueToday = (paidToday ?? []).reduce((s, p) => s + (p.amount_idr ?? 0), 0);
  const totalPages = Math.ceil((count ?? 0) / pageSize);
  const qs = (o: Record<string, string | undefined>) =>
    "?" + new URLSearchParams(Object.entries({ ...searchParams, ...o }).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Pembayaran Midtrans</h2>
          <p className="text-sm text-muted-foreground">Semua transaksi: pesanan, paket hemat, dan booking mentor.</p>
        </div>
        <Card className="px-4 py-2.5">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Lunas hari ini</p>
          <p className="text-lg font-extrabold text-[#8B0000]">{formatRupiah(revenueToday)}</p>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <a href={qs({ status: undefined, page: undefined })} className={`rounded-full border px-3 py-1 ${!searchParams.status ? "bg-slate-900 text-white" : "bg-white"}`}>Semua status</a>
        {Object.entries(STATUS).map(([k, v]) => (
          <a key={k} href={qs({ status: k, page: undefined })} className={`rounded-full border px-3 py-1 ${searchParams.status === k ? "bg-slate-900 text-white" : "bg-white"}`}>{v.label}</a>
        ))}
        <span className="mx-1 text-slate-300">|</span>
        <a href={qs({ purpose: undefined, page: undefined })} className={`rounded-full border px-3 py-1 ${!searchParams.purpose ? "bg-slate-900 text-white" : "bg-white"}`}>Semua jenis</a>
        {Object.entries(PURPOSE).map(([k, v]) => (
          <a key={k} href={qs({ purpose: k, page: undefined })} className={`rounded-full border px-3 py-1 ${searchParams.purpose === k ? "bg-slate-900 text-white" : "bg-white"}`}>{v}</a>
        ))}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Order ID Midtrans</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Jenis</th>
                <th className="px-4 py-3">Jumlah</th>
                <th className="px-4 py-3">Metode</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Waktu</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(payments ?? []).length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">Belum ada transaksi.</td></tr>
              ) : (payments ?? []).map((p) => {
                const st = STATUS[p.status] ?? { label: p.status, variant: "secondary" as const };
                const cust = (Array.isArray(p.profiles) ? p.profiles[0] : p.profiles) as { full_name: string | null } | null;
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs">{p.midtrans_order_id}{p.receipt_number && <div className="text-[10px] text-muted-foreground">{p.receipt_number}</div>}</td>
                    <td className="px-4 py-3">{cust?.full_name || "-"}</td>
                    <td className="px-4 py-3 text-xs">{PURPOSE[p.purpose] ?? p.purpose}</td>
                    <td className="px-4 py-3 font-semibold">{formatRupiah(p.amount_idr)}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{p.payment_type?.replace(/_/g, " ") ?? "-"}</td>
                    <td className="px-4 py-3"><Badge variant={st.variant}>{st.label}</Badge></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(p.paid_at ?? p.created_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}
                    </td>
                    <td className="px-4 py-3">
                      {p.status === "pending" && <PaymentSyncButton paymentId={p.id} />}
                      {p.receipt_number && <a href={`/receipt/${p.id}`} className="text-xs font-semibold text-[#8B0000] hover:underline">Receipt</a>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-xs">
            <span className="text-muted-foreground">Halaman {page} dari {totalPages}</span>
            <div className="flex gap-2">
              {page > 1 && <a href={qs({ page: String(page - 1) })} className="rounded-md border px-3 py-1 hover:bg-slate-50">← Sebelumnya</a>}
              {page < totalPages && <a href={qs({ page: String(page + 1) })} className="rounded-md border px-3 py-1 hover:bg-slate-50">Berikutnya →</a>}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
