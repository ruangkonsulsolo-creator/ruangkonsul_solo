import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatRupiah } from "@/lib/utils/format-currency";
import { PREVIEW_MODE } from "@/lib/utils/preview-mode";
import { BRAND } from "@/lib/brand";
import { Star, Check, Sparkles, Crown, ArrowRight, CalendarCheck } from "lucide-react";
import type { Metadata } from "next";
export const metadata: Metadata = { title: `Subscription | ${BRAND.name}` };

const PLANS = [
  {
    name: "Starter",
    icon: Star,
    price: 99000,
    period: "/bulan",
    desc: "Untuk mahasiswa yang baru mulai skripsi",
    features: [
      "5x cek plagiasi / bulan",
      "3x AI Detector / bulan",
      "1x DrillBit / bulan",
      "Akses webinar gratis",
      "Email support",
    ],
    popular: false,
  },
  {
    name: "Pro",
    icon: Crown,
    price: 199000,
    period: "/bulan",
    desc: "Pilihan terpopuler untuk mahasiswa aktif",
    features: [
      "15x cek plagiasi / bulan",
      "10x AI Detector / bulan",
      "5x DrillBit / bulan",
      "2 sesi bimbingan / bulan",
      "Akses semua webinar",
      "Priority WhatsApp support",
      "Diskon 10% jasa parafrase",
    ],
    popular: true,
  },
  {
    name: "Premium",
    icon: Sparkles,
    price: 349000,
    period: "/bulan",
    desc: "Untuk mahasiswa S2 & peneliti",
    features: [
      "Unlimited cek plagiasi",
      "Unlimited AI Detector",
      "10x DrillBit / bulan",
      "4 sesi bimbingan / bulan",
      "Akses semua webinar + rekaman",
      "Dedicated mentor support",
      "Diskon 20% semua layanan",
      "Free parafrase 5 halaman / bulan",
    ],
    popular: false,
  },
];

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
  const activeSub = await getActiveSubscription();

  return (
    <div className="space-y-7 max-w-4xl">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Subscription Bimbingan</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Berlangganan bulanan dan dapatkan kuota layanan + bimbingan dengan harga lebih hemat.
        </p>
      </div>

      {/* Active subscription status */}
      {activeSub && activeSub.length > 0 && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarCheck className="h-4 w-4 text-green-600" />
            <h3 className="text-sm font-bold text-green-800">Subscription Aktif</h3>
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

      {/* Pricing plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          return (
            <Card
              key={plan.name}
              className={`relative flex flex-col p-6 ${
                plan.popular ? "border-2 border-[#8B0000] shadow-lg" : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="info" className="shadow-sm">Paling Populer</Badge>
                </div>
              )}
              <div className="flex items-center gap-2 mb-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${plan.popular ? "bg-brand-gradient" : "bg-brand-50"}`}>
                  <Icon className={`h-5 w-5 ${plan.popular ? "text-white" : "text-[#8B0000]"}`} />
                </div>
                <h3 className="text-lg font-extrabold text-slate-900">{plan.name}</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">{plan.desc}</p>
              <div className="mb-5">
                <span className="text-3xl font-extrabold text-slate-900">{formatRupiah(plan.price)}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <ul className="space-y-2.5 flex-1 mb-5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-[#8B0000] flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                className={`w-full gap-2 ${plan.popular ? "" : "variant-outline"}`}
                variant={plan.popular ? "default" : "outline"}
              >
                Pilih {plan.name}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Card>
          );
        })}
      </div>

      {/* FAQ */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-900">FAQ Subscription</h3>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-slate-700">Apakah kuota terpakai bisa diakumulasikan?</p>
            <p className="text-xs text-muted-foreground mt-1">Ya, kuota yang tidak terpakai di bulan ini akan terbawa ke bulan berikutnya selama subscription aktif.</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">Bagaimana cara pembatalan?</p>
            <p className="text-xs text-muted-foreground mt-1">Kamu bisa batalkan kapan saja melalui menu Profil → Subscription. Tidak ada biaya pembatalan.</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">Apakah bisa upgrade plan?</p>
            <p className="text-xs text-muted-foreground mt-1">Ya, upgrade kapan saja. Selisih harga akan diprorata sesuai sisa hari di bulan berjalan.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
