import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, ShoppingCart, Wallet, PackageOpen, CalendarDays, AlertTriangle } from "lucide-react";
import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";
import { formatRupiah } from "@/lib/utils/format-currency";
import { ambilRingkasanOmzet, awalBulanWIB } from "@/lib/admin/omzet";

export const metadata: Metadata = { title: `Laporan Revenue | Admin ${BRAND.name}` };
export const dynamic = "force-dynamic";

const fmt = (n: number) => formatRupiah(n);
const ringkas = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`
  : n >= 1_000 ? `${Math.round(n / 1_000)} rb` : String(n);

function namaBulan(ym: string) {
  return new Date(`${ym}-01T00:00:00+07:00`).toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
}

/**
 * Laporan revenue: dihitung dari semua pembayaran lunas (cek naskah, bimbingan,
 * produk, isi saldo) menurut tanggal WIB — bukan hanya pesanan cek dokumen.
 */
export default async function AdminLaporanPage() {
  const supabase = createClient();
  const [om, ordersByService, ordersByStatus] = await Promise.all([
    ambilRingkasanOmzet(supabase),
    supabase.from("orders").select("services(name), id").gte("created_at", awalBulanWIB().toISOString()).neq("status", "dibatalkan"),
    supabase.from("orders").select("status, id"),
  ]);

  const serviceCount: Record<string, number> = {};
  for (const o of ordersByService.data ?? []) {
    const name = (o.services as unknown as { name?: string } | null)?.name ?? "Lainnya";
    serviceCount[name] = (serviceCount[name] ?? 0) + 1;
  }
  const statusCount: Record<string, number> = {};
  for (const o of ordersByStatus.data ?? []) statusCount[o.status] = (statusCount[o.status] ?? 0) + 1;
  const totalOrders = Object.values(statusCount).reduce((s, v) => s + v, 0);

  const stats = [
    { label: "Revenue Hari Ini", value: fmt(om.hariIni), icon: TrendingUp, color: "text-brand bg-brand-50" },
    { label: "Revenue Bulan Ini", value: fmt(om.bulanIni), icon: CalendarDays, color: "text-brand bg-brand-100" },
    { label: "Revenue Total", value: fmt(om.total), icon: Wallet, color: "text-brand-dark bg-brand-50" },
    { label: "Transaksi Bulan Ini", value: om.transaksiBulanIni.toLocaleString("id-ID"), icon: ShoppingCart, color: "text-amber-600 bg-amber-50" },
  ];
  const maksHarian = Math.max(1, ...om.harian.map((h) => h.jumlah));
  const maksSumber = Math.max(1, ...om.perSumberBulanIni.map((s) => s.jumlah));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Laporan Revenue</h2>
        <p className="text-sm text-slate-500">Semua pembayaran lunas — cek naskah, bimbingan, produk, dan isi saldo — menurut tanggal WIB.</p>
      </div>

      {!om.siap && (
        <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
          Ringkasan revenue belum aktif. Jalankan migrasi <code className="font-mono">046_ringkasan_omzet.sql</code> di Supabase SQL Editor.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
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

      <Card>
        <CardHeader><CardTitle className="text-sm font-semibold">Revenue 14 Hari Terakhir</CardTitle></CardHeader>
        <CardContent>
          <div className="flex h-44 items-end gap-1.5" role="img" aria-label="Grafik revenue harian 14 hari terakhir">
            {om.harian.map((h) => (
              <div key={h.tanggal} className="group flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[10px] font-semibold text-slate-500 opacity-0 transition-opacity group-hover:opacity-100">{ringkas(h.jumlah)}</span>
                <div
                  className={`w-full rounded-t-md ${h.jumlah > 0 ? "bg-brand" : "bg-slate-100"}`}
                  style={{ height: `${Math.max(3, (h.jumlah / maksHarian) * 100)}%` }}
                  title={`${h.tanggal}: ${fmt(h.jumlah)}`}
                />
                <span className="text-[10px] text-slate-400">{h.tanggal.slice(8)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-sm font-semibold"><Wallet className="h-4 w-4" />Sumber Revenue (Bulan Ini)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {om.perSumberBulanIni.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada pembayaran bulan ini.</p> : om.perSumberBulanIni.map((s) => (
              <div key={s.purpose}>
                <div className="mb-1 flex justify-between gap-3 text-sm">
                  <span className="text-slate-700">{s.label} <span className="text-xs text-slate-400">· {s.transaksi}x</span></span>
                  <span className="font-semibold">{fmt(s.jumlah)}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100"><div className="h-2 rounded-full bg-brand" style={{ width: `${Math.round((s.jumlah / maksSumber) * 100)}%` }} /></div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-sm font-semibold"><CalendarDays className="h-4 w-4" />Per Bulan</CardTitle></CardHeader>
          <CardContent>
            {om.bulanan.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada data.</p> : (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-slate-500"><th className="pb-2 font-medium">Bulan</th><th className="pb-2 text-right font-medium">Transaksi</th><th className="pb-2 text-right font-medium">Revenue</th></tr></thead>
                <tbody>
                  {om.bulanan.map((b) => (
                    <tr key={b.bulan} className="border-t border-slate-100">
                      <td className="py-2 text-slate-700">{namaBulan(b.bulan)}</td>
                      <td className="py-2 text-right text-slate-600">{b.transaksi.toLocaleString("id-ID")}</td>
                      <td className="py-2 text-right font-semibold">{fmt(b.jumlah)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-sm font-semibold"><PackageOpen className="h-4 w-4" />Pesanan per Layanan (Bulan Ini)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(serviceCount).length === 0 ? <p className="text-sm text-muted-foreground">Belum ada data.</p> : Object.entries(serviceCount).sort(([, a], [, b]) => b - a).map(([name, count]) => {
              const pct = Math.round((count / Math.max(...Object.values(serviceCount))) * 100);
              return (
                <div key={name}>
                  <div className="mb-1 flex justify-between text-sm"><span className="text-slate-700">{name}</span><span className="font-semibold">{count}x</span></div>
                  <div className="h-2 w-full rounded-full bg-slate-100"><div className="h-2 rounded-full bg-brand" style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-sm font-semibold"><ShoppingCart className="h-4 w-4" />Status Pesanan Cek Naskah</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {[
              { key: "menunggu_pembayaran", label: "Menunggu Bayar", color: "bg-amber-400" },
              { key: "diproses", label: "Sedang Diproses", color: "bg-brand-light" },
              { key: "selesai", label: "Selesai", color: "bg-emerald-500" },
              { key: "processing_failed", label: "Perlu Dicek", color: "bg-red-500" },
              { key: "dibatalkan", label: "Dibatalkan", color: "bg-slate-300" },
            ].map(({ key, label, color }) => (
              <div key={key} className="flex items-center gap-3 text-sm">
                <div className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${color}`} />
                <span className="flex-1 text-slate-700">{label}</span>
                <span className="font-semibold">{statusCount[key] ?? 0}</span>
              </div>
            ))}
            <div className="flex justify-between border-t pt-2 text-sm font-semibold"><span>Total</span><span>{totalOrders}</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
