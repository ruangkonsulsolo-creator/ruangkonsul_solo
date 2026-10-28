import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ClipboardList, Users, TrendingUp, Clock } from "lucide-react";
import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";
export const metadata: Metadata = { title: `Admin Dashboard | ${BRAND.name}` };

function fmt(n: number) { return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n); }

const STATUS_BADGE: Record<string, { label: string; variant: "success"|"warning"|"info"|"destructive"|"secondary" }> = {
  menunggu_pembayaran: { label: "Menunggu", variant: "warning" },
  dibayar:    { label: "Dibayar",   variant: "info" },
  diproses:   { label: "Diproses",  variant: "info" },
  selesai:    { label: "Selesai",   variant: "success" },
  dibatalkan: { label: "Batal",     variant: "destructive" },
};

export default async function AdminDashboardPage() {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);
  const [{ count: totalOrders }, { count: pendingOrders }, { count: todayOrders }, { count: totalUsers }, revenueResult, recentOrders] = await Promise.all([
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "diproses"),
    supabase.from("orders").select("*", { count: "exact", head: true }).gte("created_at", `${today}T00:00:00Z`),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "user"),
    supabase.from("transactions").select("amount_idr").eq("type", "order_payment").gte("created_at", `${today}T00:00:00Z`),
    supabase.from("orders").select("id, order_number, status, created_at, services(name), profiles(full_name)").order("created_at", { ascending: false }).limit(8),
  ]);
  const todayRevenue = (revenueResult.data ?? []).reduce((s, t) => s + (t.amount_idr ?? 0), 0);
  const stats = [
    { label: "Pesanan Hari Ini", value: todayOrders ?? 0, icon: ClipboardList, color: "text-brand bg-brand-50" },
    { label: "Perlu Diproses",   value: pendingOrders ?? 0, icon: Clock, color: "text-amber-600 bg-amber-50" },
    { label: "Revenue Hari Ini", value: fmt(todayRevenue), icon: TrendingUp, color: "text-brand bg-brand-100" },
    { label: "Total Pengguna",   value: totalUsers ?? 0, icon: Users, color: "text-brand-dark bg-brand-50" },
  ];
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900">Dashboard Admin</h2>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.color}`}><Icon className="h-5 w-5" /></div>
                <div><p className="text-2xl font-bold text-slate-900">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">Pesanan Terbaru</CardTitle>
          <Link href="/admin/pesanan" className="text-xs text-brand hover:underline">Lihat semua →</Link>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5">No. Pesanan</th><th className="px-4 py-2.5">User</th><th className="px-4 py-2.5">Layanan</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5">Waktu</th><th className="px-4 py-2.5">Aksi</th>
            </tr></thead>
            <tbody className="divide-y">
              {(recentOrders.data ?? []).map((order) => {
                const s = STATUS_BADGE[order.status] ?? { label: order.status, variant: "secondary" as const };
                const profile = order.profiles as any;
                const service = order.services as any;
                return (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-mono text-xs">{order.order_number}</td>
                    <td className="px-4 py-2.5 text-slate-600">{profile?.full_name ?? "-"}</td>
                    <td className="px-4 py-2.5">{service?.name ?? "-"}</td>
                    <td className="px-4 py-2.5"><Badge variant={s.variant}>{s.label}</Badge></td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="px-4 py-2.5"><Link href={`/admin/pesanan/${order.id}`} className="text-xs text-brand hover:underline">Detail</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
