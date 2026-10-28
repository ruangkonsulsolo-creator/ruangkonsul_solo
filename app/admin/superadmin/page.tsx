import { SuperadminDashboard } from "@/components/admin/SuperadminDashboard";
import { SuperadminStats } from "@/components/admin/SuperadminStats";
import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";

export const metadata: Metadata = { title: `Superadmin Panel | ${BRAND.name}` };

// ── Coba ambil data real dari DB, fallback ke dummy ──────────────
async function getData() {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();

    const [servicesRes, packagesRes, bannersRes, kelasRes, txRes, ordersRes, usersRes, bookingsRes] = await Promise.all([
      supabase.from("services").select("*").order("created_at", { ascending: true }),
      supabase.from("quota_packages").select("*, services(name)").order("created_at", { ascending: true }),
      supabase.from("banners").select("*").order("sort_order", { ascending: true }),
      supabase.from("kelas_bimbingan").select("id, tab, title, harga, is_active, sort_order").order("sort_order", { ascending: true }),
      supabase.from("transactions").select("amount_idr").eq("type", "order_payment"),
      supabase.from("orders").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "user"),
      supabase.from("bookings").select("*", { count: "exact", head: true }),
    ]);

    // Jika services berhasil diambil (artinya DB aktif), kembalikan data nyata
    if (servicesRes.data && servicesRes.data.length > 0) {
      const totalRevenue = (txRes.data ?? []).reduce((s, t) => s + (t.amount_idr ?? 0), 0);
      return {
        isLive: true,
        services:  servicesRes.data,
        packages:  packagesRes.data ?? [],
        banners:   bannersRes.data ?? [],
        kelas:     kelasRes.data ?? [],
        stats: {
          totalRevenue,
          totalOrders:   ordersRes.count ?? 0,
          totalUsers:    usersRes.count ?? 0,
          totalBookings: bookingsRes.count ?? 0,
        },
      };
    }
  } catch { /* DB belum siap */ }

  // ── Dummy data untuk preview ────────────────────────────────────
  return {
    isLive: false,
    services: [
      { id: "svc-1", slug: "plagiasi",    name: "Cek Plagiasi",    description: "Laporan similarity Turnitin", price_idr: 35000, sla_hours: 24, is_active: true },
      { id: "svc-2", slug: "ai-detector", name: "AI Detector",     description: "GPT Zero Detector",          price_idr: 25000, sla_hours: 12, is_active: true },
      { id: "svc-3", slug: "drillbit",    name: "DrillBit Checker",description: "Plagiasi + AI",              price_idr: 45000, sla_hours: 48, is_active: true },
      { id: "svc-4", slug: "parafrase",   name: "Jasa Parafrase",  description: "Turunkan plagiasi",          price_idr: 75000, sla_hours: 72, is_active: true },
    ],
    packages: [
      { id: "pkg-1", name: "Starter",    service_id: "svc-1", quota_amount: 10, price_idr: 299000,  validity_days: 30, is_active: true, is_popular: false, services: { name: "Cek Plagiasi" } },
      { id: "pkg-2", name: "Popular",    service_id: "svc-1", quota_amount: 25, price_idr: 625000,  validity_days: 60, is_active: true, is_popular: true,  services: { name: "Cek Plagiasi" } },
      { id: "pkg-3", name: "Pro",        service_id: "svc-1", quota_amount: 50, price_idr: 1100000, validity_days: 90, is_active: true, is_popular: false, services: { name: "Cek Plagiasi" } },
      { id: "pkg-4", name: "AI Starter", service_id: "svc-2", quota_amount: 10, price_idr: 199000,  validity_days: 30, is_active: true, is_popular: false, services: { name: "AI Detector" } },
      { id: "pkg-5", name: "AI Pro",     service_id: "svc-2", quota_amount: 25, price_idr: 450000,  validity_days: 60, is_active: true, is_popular: true,  services: { name: "AI Detector" } },
    ],
    banners: [
      { id: "bnr-1", title: "Kelas Bimbingan Private Skripsi",  image_url: "/promo-bimbingan.jpeg",  link_url: "/bimbingan",      sort_order: 0, is_active: true  },
      { id: "bnr-2", title: "Paket Bundling Hemat",             image_url: "/promo-bundling.jpeg",   link_url: "/paket-hemat",    sort_order: 1, is_active: true  },
      { id: "bnr-3", title: "Konsultasi Proposal & Skripsi",    image_url: "/promo-konsultasi.jpeg", link_url: "/bimbingan",      sort_order: 2, is_active: true  },
      { id: "bnr-4", title: "Jasa Parafrase Profesional",       image_url: "/promo-parafrase.jpeg",  link_url: "/jasa-parafrase", sort_order: 3, is_active: false },
    ],
    kelas: [
      { id: "kls-1", tab: "seminar", title: "Seminar: Tips Lolos Sidang",         harga: 0,       is_active: true,  sort_order: 0 },
      { id: "kls-2", tab: "skripsi", title: "Bimbingan Skripsi — Weekdays",        harga: 3750000, is_active: true,  sort_order: 1 },
      { id: "kls-3", tab: "skripsi", title: "Bimbingan Skripsi — Weekend",         harga: 4499000, is_active: true,  sort_order: 2 },
      { id: "kls-4", tab: "lomba",   title: "Bimbingan Lomba BPC & BCC",           harga: 1500000, is_active: true,  sort_order: 3 },
      { id: "kls-5", tab: "lomba",   title: "Bimbingan Lomba KTI, Essay & Paper",  harga: 999000,  is_active: true,  sort_order: 4 },
      { id: "kls-6", tab: "data",    title: "Bimbingan SPSS & SmartPLS",           harga: 750000,  is_active: true,  sort_order: 5 },
      { id: "kls-7", tab: "data",    title: "Bimbingan Python & R Studio",         harga: 850000,  is_active: false, sort_order: 6 },
    ],
    stats: { totalRevenue: 0, totalOrders: 0, totalUsers: 0, totalBookings: 0 },
  };
}

export default async function SuperadminPage() {
  const data = await getData();

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Superadmin Panel</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kontrol penuh semua konten, harga, dan konfigurasi {BRAND.name}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${
            data.isLive
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-amber-50 border-amber-200 text-amber-700"
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${data.isLive ? "bg-green-500" : "bg-amber-400"}`} />
            {data.isLive ? "Live — DB Aktif" : "Preview — Data Dummy"}
          </span>
          <span className="rounded-full bg-[#8B0000] text-white px-3 py-1 text-xs font-extrabold">
            ⚡ Superadmin
          </span>
        </div>
      </div>

      {/* Notice jika preview */}
      {!data.isLive && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm">
          <span className="text-lg mt-0.5">⚠️</span>
          <div>
            <p className="font-semibold text-amber-800">Mode Preview — Perubahan Tidak Tersimpan</p>
            <p className="text-amber-700 text-xs mt-0.5">
              Database belum aktif. Jalankan migrations via SQL Editor Supabase untuk mengaktifkan penyimpanan nyata.
              <a href="https://supabase.com/dashboard/project/anegfcpfxhhpvaaiiusa/sql/new"
                target="_blank" rel="noopener noreferrer"
                className="ml-1 underline font-semibold">Buka SQL Editor →</a>
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <SuperadminStats
        totalRevenue={data.stats.totalRevenue}
        totalOrders={data.stats.totalOrders}
        totalUsers={data.stats.totalUsers}
        totalBookings={data.stats.totalBookings}
      />

      {/* Editor konten */}
      <SuperadminDashboard
        services={data.services as any}
        packages={data.packages as any}
        banners={data.banners as any}
        kelas={data.kelas as any}
      />

    </div>
  );
}
