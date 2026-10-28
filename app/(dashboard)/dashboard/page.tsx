import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/utils/format-currency";
import { PREVIEW_MODE, PREVIEW_PROFILE } from "@/lib/utils/preview-mode";
import {
  FileSearch, Bot, BookOpenCheck, PenLine, GraduationCap,
  ArrowRight, Clock, PackageOpen, Gift, Star, Megaphone,
  ShoppingBag, Video,
} from "lucide-react";
import { BRAND } from "@/lib/brand";

const LAYANAN = [
  { href: "/cek-plagiasi",  label: "Cek Turnitin",   desc: "Laporan similarity",   icon: FileSearch,   harga: 35000 },
  { href: "/cek-ai",        label: "AI Detector",    desc: "Deteksi tulisan AI",   icon: Bot,          harga: 25000 },
  { href: "/cek-drillbit",  label: "DrillBit",       desc: "Mesin DrillBit",       icon: BookOpenCheck,harga: 45000 },
  { href: "/jasa-parafrase",label: "Parafrase",      desc: "Turunkan plagiasi",    icon: PenLine,      harga: 75000 },
  { href: "/bimbingan",     label: "Bimbingan",      desc: "Skripsi, lomba, data", icon: GraduationCap,harga: 0     },
];

const FITUR_CUSTOMER = [
  { icon: Gift,        label: "Promo & Bonus",    desc: "Diskon eksklusif member",    href: "/dashboard/promo" },
  { icon: Star,        label: "Subscription",     desc: "Paket bimbingan bulanan",    href: "/dashboard/subscription" },
  { icon: Video,       label: "Webinar",           desc: "Ikut seminar online gratis", href: "/dashboard/webinar" },
  { icon: ShoppingBag, label: "Merchandise",       desc: "Produk resmi RK Solo",       href: "/dashboard/merchandise" },
  { icon: Megaphone,   label: "Referral",          desc: "Ajak teman, dapat komisi",   href: "/referral" },
  { icon: PackageOpen, label: "Paket Saya",        desc: "Kelola kuota aktif",          href: "/dashboard/paket-saya" },
];

const STATUS_CONFIG: Record<string, { label: string; variant: "success"|"warning"|"info"|"destructive"|"muted" }> = {
  menunggu_pembayaran: { label: "Menunggu Bayar", variant: "warning" },
  dibayar:             { label: "Dibayar",        variant: "info" },
  diproses:            { label: "Diproses",       variant: "info" },
  selesai:             { label: "Selesai",        variant: "success" },
  dibatalkan:          { label: "Dibatalkan",     variant: "destructive" },
};

async function getData() {
  if (PREVIEW_MODE) {
    return {
      nama:    "Kamu",
      credits: 50000,
      orders:  [] as any[],
      quotas:  [] as any[],
    };
  }
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const { redirect } = await import("next/navigation");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const [profileRes, ordersRes, quotasRes] = await Promise.all([
      supabase.from("profiles").select("full_name, role, credit_balance").eq("id", user!.id).single(),
      supabase.from("orders").select("id, order_number, status, created_at, services(name)").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(5),
      supabase.from("user_quotas").select("id, quota_remaining, expires_at, services(name)").eq("user_id", user!.id).eq("is_expired", false).gt("quota_remaining", 0).order("expires_at", { ascending: true }),
    ]);

    const role = profileRes.data?.role ?? "user";
    if (role === "mentor")     redirect("/mentor");
    if (role === "admin")      redirect("/admin");
    if (role === "superadmin") redirect("/admin/superadmin");

    return {
      nama:    profileRes.data?.full_name?.split(" ")[0] ?? "Kamu",
      credits: profileRes.data?.credit_balance ?? 0,
      orders:  ordersRes.data ?? [],
      quotas:  quotasRes.data ?? [],
    };
  } catch {
    return { nama: "Kamu", credits: 0, orders: [], quotas: [] };
  }
}

export default async function CustomerDashboardPage() {
  const { nama, credits, orders, quotas } = await getData();

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Halo, {nama}! 👋</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Selamat datang di dashboard kamu.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {credits > 0 && (
            <div className="flex items-center gap-2 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-2">
              <Gift className="h-4 w-4 text-[#8B0000]" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Kredit Referral</p>
                <p className="text-sm font-bold text-[#8B0000]">{formatRupiah(credits)}</p>
              </div>
            </div>
          )}
          {quotas.length > 0 && (
            <Link href="/dashboard/paket-saya"
              className="flex items-center gap-2 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-medium text-[#8B0000] hover:bg-brand-100 transition-colors">
              <PackageOpen className="h-4 w-4" />
              <span className="font-bold">{(quotas[0] as any).quota_remaining}×</span> kuota aktif
              <ArrowRight className="h-3.5 w-3.5 opacity-60" />
            </Link>
          )}
        </div>
      </div>

      {/* Layanan */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Layanan</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
          {LAYANAN.map((l) => {
            const Icon = l.icon;
            return (
              <Link key={l.href} href={l.href}
                className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-card card-hover ring-2 ring-transparent hover:ring-brand/20 transition-all">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 mb-3">
                  <Icon className="h-5 w-5 text-[#8B0000]" />
                </div>
                <p className="font-bold text-slate-900 text-sm group-hover:text-[#8B0000] transition-colors">{l.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 mb-2">{l.desc}</p>
                {l.harga > 0
                  ? <p className="text-xs font-semibold text-[#8B0000] mt-auto">{formatRupiah(l.harga)}<span className="font-normal text-muted-foreground">/file</span></p>
                  : <p className="text-xs font-semibold text-[#8B0000] mt-auto flex items-center gap-1">Lihat <ArrowRight className="h-3 w-3" /></p>
                }
              </Link>
            );
          })}
        </div>
      </div>

      {/* Fitur Customer */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Fitur Member</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {FITUR_CUSTOMER.map((f) => {
            const Icon = f.icon;
            return (
              <Link key={f.label} href={f.href}
                className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card card-hover hover:border-brand-200 transition-all">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-50">
                  <Icon className="h-5 w-5 text-[#8B0000]" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 text-sm group-hover:text-[#8B0000] transition-colors truncate">{f.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{f.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Pesanan terakhir */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Pesanan Terakhir</h3>
          <Link href="/dashboard/riwayat-pesanan" className="text-xs font-semibold text-[#8B0000] hover:underline flex items-center gap-1">
            Lihat semua <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {orders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center">
            <Clock className="h-8 w-8 text-slate-200" />
            <p className="text-sm text-muted-foreground">Belum ada pesanan. Mulai dari layanan di atas.</p>
            <Button asChild size="sm"><Link href="/cek-plagiasi">Cek Sekarang</Link></Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-card">
            <div className="divide-y divide-slate-100">
              {orders.map((order: any) => {
                const s = STATUS_CONFIG[order.status] ?? { label: order.status, variant: "muted" as const };
                return (
                  <div key={order.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{order.order_number}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {order.services?.name} · {new Date(order.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <Badge variant={s.variant} className="ml-3 flex-shrink-0">{s.label}</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
