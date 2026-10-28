import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatRupiah } from "@/lib/utils/format-currency";
import { PREVIEW_MODE, PREVIEW_PROFILE } from "@/lib/utils/preview-mode";
import { BRAND } from "@/lib/brand";
import { Gift, Tag, Sparkles, ArrowRight, Clock } from "lucide-react";
import type { Metadata } from "next";
export const metadata: Metadata = { title: `Promo & Bonus | ${BRAND.name}` };

const PROMOS = [
  { img: "/promo-bundling.jpeg",    title: "Bundling Hemat 3 Layanan",   desc: "Plagiasi + AI Detector + DrillBit dalam 1 paket. Hemat 30%!", badge: "Popular", oldPrice: 105000, price: 73500 },
  { img: "/promo-bimbingan.jpeg",   title: "Bimbingan Skripsi Promo",     desc: "3 sesi bimbingan dengan mentor pilihan. Hanya bulan ini.", badge: "Terbatas", oldPrice: 450000, price: 300000 },
  { img: "/promo-konsultasi.jpeg",  title: "Konsultasi Gratis 15 Menit", desc: "Konsultasi awal dengan mentor untuk tentukan topik skripsi.", badge: "Gratis", oldPrice: 0, price: 0 },
  { img: "/promo-parafrase.jpeg",   title: "Parafrase Diskon 20%",       desc: "Penurunan plagiasi dokumen diskon khusus member.", badge: "Member", oldPrice: 75000, price: 60000 },
];

async function getCredits() {
  if (PREVIEW_MODE) return PREVIEW_PROFILE.credit_balance;
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;
    const { data } = await supabase.from("profiles").select("credit_balance").eq("id", user!.id).single();
    return data?.credit_balance ?? 0;
  } catch {
    return 0;
  }
}

export default async function PromoPage() {
  const credits = await getCredits();

  return (
    <div className="space-y-7 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Promo & Bonus</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Penawaran eksklusif untuk member {BRAND.shortName}.</p>
        </div>
        {credits > 0 && (
          <div className="flex items-center gap-2 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-2">
            <Gift className="h-4 w-4 text-[#8B0000]" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Kredit Referral</p>
              <p className="text-sm font-bold text-[#8B0000]">{formatRupiah(credits)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Promo cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PROMOS.map((p) => (
          <Card key={p.title} className="overflow-hidden group">
            <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
              <Image
                src={p.img}
                alt={p.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 640px) 100vw, 50vw"
              />
              <div className="absolute top-3 left-3">
                <Badge variant={p.badge === "Gratis" ? "success" : p.badge === "Popular" ? "info" : "warning"}>
                  {p.badge}
                </Badge>
              </div>
            </div>
            <div className="p-4 space-y-2">
              <h3 className="font-bold text-slate-900">{p.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
              <div className="flex items-end gap-2 pt-1">
                {p.oldPrice > 0 && (
                  <span className="text-xs text-muted-foreground line-through">{formatRupiah(p.oldPrice)}</span>
                )}
                <span className="text-lg font-extrabold text-[#8B0000]">
                  {p.price === 0 ? "Gratis" : formatRupiah(p.price)}
                </span>
              </div>
              <Button asChild size="sm" className="w-full gap-2 mt-2">
                <Link href="/paket-hemat">
                  Klaim Promo <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Bonus section */}
      <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white flex-shrink-0">
            <Sparkles className="h-5 w-5 text-[#8B0000]" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-900">Bonus Referral</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Ajak teman daftar dengan kode referral-mu. Kamu dapat <strong className="text-[#8B0000]">{formatRupiah(10000)}</strong> kredit
              untuk setiap teman yang membuat pesanan pertama.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3 gap-2">
              <Link href="/referral">
                <Tag className="h-3.5 w-3.5" /> Lihat Kode Referral Saya <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Flash sale banner */}
      <div className="flex items-center gap-3 rounded-2xl bg-slate-900 text-white p-5">
        <Clock className="h-5 w-5 text-amber-400 flex-shrink-0" />
        <p className="text-sm">
          <strong className="text-amber-400">Flash Sale!</strong> Pakai kode{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-amber-400 font-mono">RKS50</code>{" "}
          untuk diskon 50% cek plagiasi pertama. Berlaku selama stok ada.
        </p>
      </div>
    </div>
  );
}
