import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ReportDownloadButton } from "@/components/dashboard/ReportDownloadButton";
import { RebayarButton } from "@/components/dashboard/RebayarButton";
import { FileSearch, Bot, BookOpenCheck, PenLine, FileText } from "lucide-react";
import { PREVIEW_MODE, PREVIEW_USER } from "@/lib/utils/preview-mode";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Riwayat Pesanan" };

const STATUS_CONFIG: Record<string, { label: string; variant: "success" | "warning" | "info" | "destructive" | "secondary" | "outline" }> = {
  menunggu_pembayaran: { label: "Menunggu Bayar", variant: "warning" },
  dibayar:            { label: "Dibayar",         variant: "info" },
  diproses:           { label: "Diproses",        variant: "info" },
  selesai:            { label: "Selesai",         variant: "success" },
  dibatalkan:         { label: "Dibatalkan",      variant: "destructive" },
};

const SERVICE_ICONS: Record<string, React.ElementType> = {
  plagiasi:    FileSearch,
  "ai-detector": Bot,
  drillbit:    BookOpenCheck,
  parafrase:   PenLine,
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRupiah(n: number) {
  return n === 0 ? "Kuota" : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

export default async function RiwayatPesananPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { if (!PREVIEW_MODE) redirect("/login"); }

  const pageSize = 10;
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const statusFilter = searchParams.status;

  let query = supabase
    .from("orders")
    .select(`
      id, order_number, status, price_idr, payment_method,
      created_at, completed_at, midtrans_snap_token,
      services ( name, slug ),
      uploaded_files ( original_name )
    `, { count: "exact" })
    .eq("user_id", user?.id ?? PREVIEW_USER.id)
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (statusFilter && statusFilter !== "semua") {
    query = query.eq("status", statusFilter);
  }

  const { data: orders, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / pageSize);

  const statuses = ["semua", "menunggu_pembayaran", "diproses", "selesai", "dibatalkan"];

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-slate-900">Riwayat Pesanan</h2>

      {/* Filter status */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter status pesanan">
        {statuses.map((s) => {
          const isActive = (statusFilter ?? "semua") === s;
          const label = s === "semua" ? "Semua" : STATUS_CONFIG[s]?.label ?? s;
          return (
            <a
              key={s}
              href={`/dashboard/riwayat-pesanan?status=${s}&page=1`}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                isActive
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
              aria-current={isActive ? "true" : undefined}
            >
              {label}
            </a>
          );
        })}
      </div>

      {/* Tabel pesanan */}
      {!orders || orders.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <FileText className="h-10 w-10 text-slate-300" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Belum ada pesanan.</p>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Daftar pesanan">
              <thead>
                <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">No. Pesanan</th>
                  <th className="px-4 py-3">Layanan</th>
                  <th className="px-4 py-3">File</th>
                  <th className="px-4 py-3">Bayar</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((order) => {
                  const svc = order.services as any;
                  const file = order.uploaded_files as any;
                  const Icon = SERVICE_ICONS[svc?.slug] ?? FileText;
                  const st = STATUS_CONFIG[order.status] ?? { label: order.status, variant: "outline" as const };

                  return (
                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">
                        {order.order_number}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Icon className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" aria-hidden="true" />
                          <span>{svc?.name ?? "-"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-[180px] truncate text-slate-600">
                        {file?.original_name ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                        {formatRupiah(order.price_idr)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        {order.status === "selesai" ? (
                          <ReportDownloadButton orderId={order.id} />
                        ) : order.status === "menunggu_pembayaran" ? (
                          <RebayarButton orderId={order.id} snapToken={(order as any).midtrans_snap_token ?? null} />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Halaman {page} dari {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <a
                    href={`/dashboard/riwayat-pesanan?status=${statusFilter ?? "semua"}&page=${page - 1}`}
                    className="rounded-md border px-3 py-1 text-xs hover:bg-slate-50"
                  >
                    ← Sebelumnya
                  </a>
                )}
                {page < totalPages && (
                  <a
                    href={`/dashboard/riwayat-pesanan?status=${statusFilter ?? "semua"}&page=${page + 1}`}
                    className="rounded-md border px-3 py-1 text-xs hover:bg-slate-50"
                  >
                    Berikutnya →
                  </a>
                )}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
