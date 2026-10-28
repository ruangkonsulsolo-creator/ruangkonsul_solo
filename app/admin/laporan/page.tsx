import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, ShoppingCart, Users, PackageOpen } from "lucide-react";
import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";
export const metadata: Metadata = { title: `Laporan Revenue | Admin ${BRAND.name}` };

function fmt(n: number) { return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n); }

export default async function AdminLaporanPage() {
  const supabase = createClient();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const [txAll, txToday, txMonth, ordersByService, ordersByStatus] = await Promise.all([
    supabase.from("transactions").select("amount_idr").eq("type", "order_payment"),
    supabase.from("transactions").select("amount_idr").eq("type", "order_payment").gte("created_at", startOfDay),
    supabase.from("transactions").select("amount_idr").eq("type", "order_payment").gte("created_at", startOfMonth),
    supabase.from("orders").select("services(name), id").gte("created_at", startOfMonth).neq("status", "dibatalkan"),
    supabase.from("orders").select("status, id"),
  ]);
  const totalRevenue = (txAll.data ?? []).reduce((s, t) => s + (t.amount_idr ?? 0), 0);
  const todayRevenue = (txToday.data ?? []).reduce((s, t) => s + (t.amount_idr ?? 0), 0);
  const monthRevenue = (txMonth.data ?? []).reduce((s, t) => s + (t.amount_idr ?? 0), 0);
  const serviceCount: Record<string, number> = {};
  for (const o of ordersByService.data ?? []) { const name = (o.services as any)?.name ?? "Unknown"; serviceCount[name] = (serviceCount[name] ?? 0) + 1; }
  const statusCount: Record<string, number> = {};
  for (const o of ordersByStatus.data ?? []) { statusCount[o.status] = (statusCount[o.status] ?? 0) + 1; }
  const totalOrders = Object.values(statusCount).reduce((s, v) => s + v, 0);
  const completedOrders = statusCount["selesai"] ?? 0;
  const completionRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;
  const stats = [
    { label: "Revenue Hari Ini",  value: fmt(todayRevenue),  icon: TrendingUp, color: "text-brand bg-brand-50" },
    { label: "Revenue Bulan Ini", value: fmt(monthRevenue),  icon: TrendingUp, color: "text-brand bg-brand-100" },
    { label: "Revenue Total",     value: fmt(totalRevenue),  icon: TrendingUp, color: "text-brand-dark bg-brand-50" },
    { label: "Tingkat Penyelesaian", value: `${completionRate}%`, icon: ShoppingCart, color: "text-amber-600 bg-amber-50" },
  ];
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900">Laporan Revenue</h2>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.color}`}><Icon className="h-5 w-5" /></div>
                <div><p className="text-xl font-bold text-slate-900">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><PackageOpen className="h-4 w-4" />Pesanan per Layanan (Bulan Ini)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(serviceCount).length === 0 ? <p className="text-sm text-muted-foreground">Belum ada data.</p> : Object.entries(serviceCount).sort(([, a], [, b]) => b - a).map(([name, count]) => {
              const maxCount = Math.max(...Object.values(serviceCount));
              const pct = Math.round((count / maxCount) * 100);
              return (
                <div key={name}>
                  <div className="flex justify-between text-sm mb-1"><span className="text-slate-700">{name}</span><span className="font-semibold">{count}x</span></div>
                  <div className="h-2 w-full rounded-full bg-slate-100"><div className="h-2 rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><Users className="h-4 w-4" />Distribusi Status Pesanan</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {[
              { key: "diproses",   label: "Sedang Diproses", color: "bg-brand" },
              { key: "selesai",    label: "Selesai",         color: "bg-brand" },
              { key: "menunggu_pembayaran", label: "Menunggu Bayar", color: "bg-yellow-400" },
              { key: "dibatalkan", label: "Dibatalkan",      color: "bg-red-400" },
            ].map(({ key, label, color }) => (
              <div key={key} className="flex items-center gap-3 text-sm">
                <div className={`h-2.5 w-2.5 rounded-full ${color} flex-shrink-0`} />
                <span className="flex-1 text-slate-700">{label}</span>
                <span className="font-semibold">{statusCount[key] ?? 0}</span>
              </div>
            ))}
            <div className="border-t pt-2 flex justify-between text-sm font-semibold"><span>Total</span><span>{totalOrders}</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
