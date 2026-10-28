import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PackageOpen, ArrowRight, Clock, AlertTriangle } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { PREVIEW_MODE, PREVIEW_USER } from "@/lib/utils/preview-mode";
import type { Metadata } from "next";
export const metadata: Metadata = { title: `Paket Saya | ${BRAND.name}` };

function daysLeft(expiresAt: string) { return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000); }
function fmt(n: number) { return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n); }

export default async function PaketSayaPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { if (!PREVIEW_MODE) redirect("/login"); }
  const { data: activeQuotas } = await supabase.from("user_quotas").select("id, quota_remaining, quota_total, expires_at, purchased_at, services(name, slug)").eq("user_id", user?.id ?? PREVIEW_USER.id).eq("is_expired", false).order("expires_at", { ascending: true });
  const { data: expiredQuotas } = await supabase.from("user_quotas").select("id, quota_remaining, quota_total, expires_at, purchased_at, services(name)").eq("user_id", user?.id ?? PREVIEW_USER.id).eq("is_expired", true).order("expires_at", { ascending: false }).limit(10);
  const active = activeQuotas ?? [];
  const expired = expiredQuotas ?? [];

  return (
    <div className="space-y-7 max-w-3xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-slate-900">Paket Saya</h2>
        <Button asChild size="sm" className="gap-2"><Link href="/paket-hemat">Beli Paket Baru <ArrowRight className="h-3.5 w-3.5" /></Link></Button>
      </div>
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Kuota Aktif</h3>
        {active.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-white py-14 text-center">
            <PackageOpen className="h-10 w-10 text-slate-200" />
            <div><p className="text-sm font-semibold text-slate-700">Belum ada paket aktif</p><p className="text-xs text-muted-foreground mt-1">Beli paket hemat dan hemat lebih banyak per cek-nya.</p></div>
            <Button asChild size="sm" className="gap-2"><Link href="/paket-hemat">Lihat Paket Hemat <ArrowRight className="h-3.5 w-3.5" /></Link></Button>
          </div>
        ) : (
          <div className="space-y-3">
            {active.map((q) => {
              const svc = q.services as any;
              const days = daysLeft(q.expires_at);
              const pct = Math.round((q.quota_remaining / q.quota_total) * 100);
              const isWarning = days <= 7 || q.quota_remaining <= 3;
              return (
                <div key={q.id} className={`rounded-2xl border bg-white p-5 shadow-card ${isWarning ? "border-amber-300" : "border-slate-200"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 flex-shrink-0"><PackageOpen className="h-5 w-5 text-brand" /></div>
                      <div><p className="font-bold text-slate-900">{svc?.name ?? "Layanan"}</p><p className="text-xs text-muted-foreground mt-0.5">Dibeli {new Date(q.purchased_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p></div>
                    </div>
                    <div className="text-right flex-shrink-0"><p className="text-2xl font-extrabold text-brand">{q.quota_remaining}x</p><p className="text-xs text-muted-foreground">dari {q.quota_total}x</p></div>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1.5"><span>Sisa kuota</span><span>{pct}%</span></div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden"><div className={`h-2 rounded-full transition-all ${pct > 50 ? "bg-brand" : pct > 20 ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${pct}%` }} /></div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs">
                      {isWarning ? <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" /> : <Clock className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />}
                      <span className={isWarning ? "text-amber-700 font-semibold" : "text-muted-foreground"}>{days > 0 ? `Kedaluwarsa dalam ${days} hari` : "Kedaluwarsa hari ini!"}</span>
                    </div>
                    <Link href={`/dashboard/${svc?.slug ?? ""}`} className="text-xs font-semibold text-brand hover:underline flex items-center gap-1">Pakai sekarang <ArrowRight className="h-3 w-3" /></Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {expired.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Riwayat Paket</h3>
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-card">
            <div className="divide-y divide-slate-100">
              {expired.map((q) => {
                const svc = q.services as any;
                const used = q.quota_total - q.quota_remaining;
                return (
                  <div key={q.id} className="flex items-center justify-between px-5 py-3.5">
                    <div><p className="text-sm font-semibold text-slate-700">{svc?.name ?? "Layanan"}</p><p className="text-xs text-muted-foreground mt-0.5">{used}/{q.quota_total} terpakai · {new Date(q.expires_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</p></div>
                    <Badge variant="muted">Kedaluwarsa</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
