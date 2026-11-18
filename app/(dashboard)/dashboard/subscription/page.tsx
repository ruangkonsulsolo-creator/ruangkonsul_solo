import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatRupiah } from "@/lib/utils/format-currency";
import { PREVIEW_MODE } from "@/lib/utils/preview-mode";
import { BRAND } from "@/lib/brand";
import { BuyPackageButton } from "@/components/payment/BuyPackageButton";
import { Star, Check, Sparkles, Crown, ArrowRight, CalendarCheck } from "lucide-react";
import type { Metadata } from "next";
export const metadata: Metadata = { title: `Paket Hemat | ${BRAND.name}` };

interface PackageRow {
  id: string; name: string; quota_amount: number; price_idr: number;
  validity_days: number; is_popular: boolean; services: { name: string; slug: string } | null;
}

/** Paket hemat aktif dari DB (dikelola superadmin di /admin/paket). */
async function getPackages(): Promise<PackageRow[]> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    const { data } = await supabase
      .from("quota_packages")
      .select("id, name, quota_amount, price_idr, validity_days, is_popular, services(name, slug)")
      .eq("is_active", true)
      .order("price_idr", { ascending: true });
    return ((data ?? []) as any[]).map((p) => ({
      ...p,
      services: Array.isArray(p.services) ? p.services[0] ?? null : p.services,
    }));
  } catch {
    return [];
  }
}

async function getActiveSubscription() {
  if (PREVIEW_MODE) return null;
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from("user_quotas")
      .select("id, quota_total, quota_remaining, expires_at, services(name)")
      .eq("user_id", user!.id)
      .eq("is_expired", false)
      .order("expires_at", { ascending: true });
    return data;
  } catch {
    return null;
  }
}

export default async function SubscriptionPage() {
  const [activeSub, packages] = await Promise.all([getActiveSubscription(), getPackages()]);

  return (
    <div className="space-y-7 max-w-4xl">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Paket Hemat &amp; Kuota</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Beli kuota sekaligus dengan harga per cek yang lebih murah. Bayar sekali via QRIS, VA bank, atau e-wallet.
        </p>
      </div>

      {/* Active subscription status */}
      {activeSub && activeSub.length > 0 && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarCheck className="h-4 w-4 text-green-600" />
            <h3 className="text-sm font-bold text-green-800">Kuota Aktif</h3>
          </div>
          <div className="space-y-2">
            {(activeSub as any[]).map((q) => (
              <div key={q.id} className="flex items-center justify-between text-sm">
                <span className="text-green-700">{q.services?.name ?? "Layanan"}</span>
                <span className="font-semibold text-green-800">{q.quota_remaining}/{q.quota_total} tersisa</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Paket dari DB */}
      {packages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-sm text-muted-foreground">
          Belum ada paket yang dijual saat ini.
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {packages.map((pkg) => {
          const Icon = pkg.is_popular ? Crown : pkg.quota_amount >= 50 ? Sparkles : Star;
          const features = [
            `${pkg.quota_amount}x ${pkg.services?.name ?? "layanan"}`,
            `${formatRupiah(Math.round(pkg.price_idr / pkg.quota_amount))} per cek`,
            `Masa aktif ${pkg.validity_days} hari`,
            "Notifikasi WhatsApp otomatis",
          ];
          return (
            <Card
              key={pkg.id}
              className={`relative flex flex-col p-6 ${
                pkg.is_popular ? "border-2 border-[#8B0000] shadow-lg" : ""
              }`}
            >
              {pkg.is_popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="info" className="shadow-sm">Paling Populer</Badge>
                </div>
              )}
              <div className="flex items-center gap-2 mb-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${pkg.is_popular ? "bg-brand-gradient" : "bg-brand-50"}`}>
                  <Icon className={`h-5 w-5 ${pkg.is_popular ? "text-white" : "text-[#8B0000]"}`} />
                </div>
                <h3 className="text-lg font-extrabold text-slate-900">{pkg.name}</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">{pkg.services?.name ?? "Layanan"}</p>
              <div className="mb-5">
                <span className="text-3xl font-extrabold text-slate-900">{formatRupiah(pkg.price_idr)}</span>
              </div>
              <ul className="space-y-2.5 flex-1 mb-5">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-[#8B0000] flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">{f}</span>
                  </li>
                ))}
              </ul>
              <BuyPackageButton
                packageId={pkg.id}
                label={`Beli ${pkg.name}`}
                returnTo="/dashboard/subscription"
                className={`rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                  pkg.is_popular
                    ? "bg-[#8B0000] text-white hover:bg-brand-light"
                    : "border border-[#8B0000] text-[#8B0000] hover:bg-brand-50"
                }`}
              />
            </Card>
          );
        })}
      </div>
      )}

      {/* FAQ */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-900">FAQ Paket</h3>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-slate-700">Kapan kuota aktif?</p>
            <p className="text-xs text-muted-foreground mt-1">Otomatis begitu pembayaran terkonfirmasi Midtrans — biasanya beberapa detik untuk QRIS/e-wallet.</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">Apa yang terjadi dengan sisa kuota saat masa aktif habis?</p>
            <p className="text-xs text-muted-foreground mt-1">Sisa kuota hangus dan tidak dapat di-refund. Lihat sisa kuota & tanggal kedaluwarsa di menu Paket Saya.</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">Apakah ini langganan otomatis?</p>
            <p className="text-xs text-muted-foreground mt-1">Tidak. Setiap paket dibayar sekali, tanpa tagihan bulanan otomatis.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
