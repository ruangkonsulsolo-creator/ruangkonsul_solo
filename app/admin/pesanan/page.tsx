import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";
export const metadata: Metadata = { title: `Manajemen Pesanan | Admin ${BRAND.name}` };

const STATUS_CONFIG: Record<string, { label: string; variant: "success"|"warning"|"info"|"destructive"|"secondary" }> = {
  menunggu_pembayaran: { label: "Menunggu Bayar", variant: "warning" },
  dibayar:    { label: "Dibayar",    variant: "info" },
  diproses:   { label: "Diproses",   variant: "info" },
  selesai:    { label: "Selesai",    variant: "success" },
  dibatalkan: { label: "Dibatalkan", variant: "destructive" },
  processing_failed: { label: "Gagal Proses", variant: "destructive" },
};

export default async function AdminPesananPage({ searchParams }: { searchParams: { status?: string; page?: string; q?: string } }) {
  const supabase = createClient();
  const pageSize = 20;
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const statusFilter = searchParams.status;
  const search = searchParams.q?.trim();
  let query = supabase.from("orders").select("id, order_number, status, price_idr, payment_method, created_at, services(name), profiles(full_name, whatsapp), uploaded_files(original_name)", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
  if (statusFilter && statusFilter !== "semua") query = query.eq("status", statusFilter);
  if (search) query = query.ilike("order_number", `%${search}%`);
  const { data: orders, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / pageSize);
  const statuses = ["semua", "menunggu_pembayaran", "diproses", "selesai", "dibatalkan", "processing_failed"];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-slate-900">Manajemen Pesanan</h2>
        <span className="text-sm text-muted-foreground">{count ?? 0} pesanan</span>
      </div>
      <div className="flex flex-wrap gap-3 items-center">
        <form method="GET" className="flex gap-2">
          <input name="q" defaultValue={search} placeholder="Cari no. pesanan..." className="rounded-md border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand w-48" />
          <button type="submit" className="rounded-md bg-slate-800 px-3 py-1.5 text-xs text-white hover:bg-slate-700">Cari</button>
        </form>
        <div className="flex flex-wrap gap-2">
          {statuses.map((s) => {
            const isActive = (statusFilter ?? "semua") === s;
            const label = s === "semua" ? "Semua" : STATUS_CONFIG[s]?.label ?? s;
            return <a key={s} href={`/admin/pesanan?status=${s}&page=1${search ? `&q=${search}` : ""}`} className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${isActive ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>{label}</a>;
          })}
        </div>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">No. Pesanan</th><th className="px-4 py-3">User</th><th className="px-4 py-3">Layanan</th><th className="px-4 py-3">File</th><th className="px-4 py-3">Bayar</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Tanggal</th><th className="px-4 py-3">Aksi</th>
            </tr></thead>
            <tbody className="divide-y">
              {(orders ?? []).length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">Tidak ada pesanan ditemukan.</td></tr>
              ) : (orders ?? []).map((order) => {
                const st = STATUS_CONFIG[order.status] ?? { label: order.status, variant: "secondary" as const };
                const profile = order.profiles as any;
                const service = order.services as any;
                const file = order.uploaded_files as any;
                return (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{order.order_number}</td>
                    <td className="px-4 py-3"><p className="font-medium text-slate-800">{profile?.full_name ?? "-"}</p><p className="text-xs text-muted-foreground">{profile?.whatsapp ?? ""}</p></td>
                    <td className="px-4 py-3">{service?.name ?? "-"}</td>
                    <td className="px-4 py-3 max-w-[140px] truncate text-slate-600 text-xs">{file?.original_name ?? "-"}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">{order.price_idr === 0 ? <span className="text-brand font-medium">Kuota</span> : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(order.price_idr)}</td>
                    <td className="px-4 py-3"><Badge variant={st.variant}>{st.label}</Badge></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(order.created_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="px-4 py-3"><Link href={`/admin/pesanan/${order.id}`} className="text-xs font-medium text-brand hover:underline">Proses →</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-xs text-muted-foreground">Halaman {page} dari {totalPages}</p>
            <div className="flex gap-2">
              {page > 1 && <a href={`/admin/pesanan?status=${statusFilter ?? "semua"}&page=${page - 1}`} className="rounded-md border px-3 py-1 text-xs hover:bg-slate-50">← Sebelumnya</a>}
              {page < totalPages && <a href={`/admin/pesanan?status=${statusFilter ?? "semua"}&page=${page + 1}`} className="rounded-md border px-3 py-1 text-xs hover:bg-slate-50">Berikutnya →</a>}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
