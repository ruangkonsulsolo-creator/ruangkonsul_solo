import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CalendarDays, Users, Clock, TrendingUp, ArrowRight } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { PREVIEW_MODE } from "@/lib/utils/preview-mode";
import type { Metadata } from "next";
export const metadata: Metadata = { title: `Dashboard Mentor | ${BRAND.name}` };

async function getData() {
  if (PREVIEW_MODE) {
    return {
      nama: "Preview Mentor",
      isAvailable: true,
      stats: { sessionCount: 47, ratingAvg: 4.9, todayBookings: 3, pricePerHour: 150000 },
      todayBookings: [
        { id: "b1", slot_start: "09:00", slot_end: "10:00", customer: "Rizky Aditya", whatsapp: "62882007483223", status: "confirmed" },
        { id: "b2", slot_start: "11:00", slot_end: "12:00", customer: "Siti Mariyam",  whatsapp: null,            status: "pending" },
        { id: "b3", slot_start: "14:00", slot_end: "15:00", customer: "Budi Santoso",  whatsapp: "62881234567",   status: "confirmed" },
      ],
      upcomingBookings: [
        { id: "u1", customer: "Dewi Rahayu",    date: "Senin, 20 Okt",   time: "10:00", topic: "Bimbingan BAB 3", status: "confirmed" },
        { id: "u2", customer: "Ahmad Fauzi",    date: "Selasa, 21 Okt",  time: "13:00", topic: "Konsultasi Judul", status: "pending" },
        { id: "u3", customer: "Linda Sari",     date: "Rabu, 22 Okt",    time: "15:00", topic: "Review BAB 4",    status: "confirmed" },
      ],
    };
  }
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const { redirect } = await import("next/navigation");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user!.id).single();
    if (!profile || !["mentor","admin","superadmin"].includes(profile.role)) redirect("/dashboard");
    const { data: mp } = await supabase.from("mentor_profiles").select("id, session_count, rating_avg, is_available, price_per_hour").eq("user_id", user!.id).single();
    const today = new Date().toISOString().slice(0, 10);
    const { data: todayB } = await supabase.from("bookings").select("id, status, booking_slots(slot_start, slot_end), profiles(full_name, whatsapp)").eq("mentor_id", mp?.id ?? "").in("status", ["confirmed","pending"]).limit(10);
    return {
      nama: profile!.full_name?.split(" ")[0] ?? "Mentor",
      isAvailable: mp?.is_available ?? false,
      stats: { sessionCount: mp?.session_count ?? 0, ratingAvg: mp?.rating_avg ?? 0, todayBookings: todayB?.length ?? 0, pricePerHour: mp?.price_per_hour ?? 0 },
      todayBookings: (todayB ?? []).map((b: any) => ({ id: b.id, slot_start: b.booking_slots?.slot_start?.slice(0,5), slot_end: b.booking_slots?.slot_end?.slice(0,5), customer: b.profiles?.full_name ?? "Klien", whatsapp: b.profiles?.whatsapp, status: b.status })),
      upcomingBookings: [],
    };
  } catch {
    return { nama: "Mentor", isAvailable: true, stats: { sessionCount: 0, ratingAvg: 0, todayBookings: 0, pricePerHour: 0 }, todayBookings: [], upcomingBookings: [] };
  }
}

export default async function MentorDashboardPage() {
  const { nama, isAvailable, stats, todayBookings, upcomingBookings } = await getData();
  const statCards = [
    { icon: Users,       label: "Total Sesi",     value: stats.sessionCount },
    { icon: TrendingUp,  label: "Rating",          value: `${stats.ratingAvg}★` },
    { icon: CalendarDays,label: "Booking Hari Ini",value: stats.todayBookings },
    { icon: Clock,       label: "Jam/Sesi",        value: `Rp ${(stats.pricePerHour/1000).toFixed(0)}K` },
  ];

  return (
    <div className="space-y-7 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Halo, {nama}! 👋</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Dashboard Mentor — {BRAND.name}</p>
        </div>
        <div className={`flex items-center gap-2 rounded-2xl px-4 py-2 border ${isAvailable ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-200"}`}>
          <div className={`h-2 w-2 rounded-full ${isAvailable ? "bg-green-500" : "bg-slate-400"}`} />
          <span className={`text-xs font-bold ${isAvailable ? "text-green-700" : "text-slate-500"}`}>{isAvailable ? "Tersedia" : "Tidak Tersedia"}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 mb-3">
                <Icon className="h-5 w-5 text-[#8B0000]" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          );
        })}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Jadwal Hari Ini</h3>
          <Link href="/mentor/jadwal" className="text-xs font-semibold text-[#8B0000] hover:underline flex items-center gap-1">
            Kelola Jadwal <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {todayBookings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-10 text-center">
            <CalendarDays className="h-8 w-8 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Tidak ada sesi hari ini</p>
            <Link href="/mentor/jadwal" className="mt-2 inline-block text-xs text-[#8B0000] hover:underline">Atur slot tersedia →</Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-card">
            <div className="divide-y divide-slate-100">
              {todayBookings.map((b: any) => (
                <div key={b.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-brand-50">
                    <span className="text-xs font-bold text-[#8B0000]">{b.slot_start ?? "--"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900">{b.customer}</p>
                    <p className="text-xs text-muted-foreground">{b.slot_start} – {b.slot_end} WIB</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={b.status === "confirmed" ? "success" : "warning"}>
                      {b.status === "confirmed" ? "Konfirmasi" : "Pending"}
                    </Badge>
                    {b.whatsapp && (
                      <a href={`https://wa.me/${b.whatsapp}`} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-[#8B0000] hover:underline">Chat</a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {upcomingBookings.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Upcoming</h3>
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-card">
            <div className="divide-y divide-slate-100">
              {upcomingBookings.map((b: any) => (
                <div key={b.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                  <div className="text-center flex-shrink-0 w-20">
                    <p className="text-xs font-bold text-[#8B0000]">{b.date.split(",")[0]}</p>
                    <p className="text-xs text-slate-500">{b.time} WIB</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{b.customer}</p>
                    {b.topic && <p className="text-xs text-muted-foreground">{b.topic}</p>}
                  </div>
                  <Badge variant={b.status === "confirmed" ? "success" : "warning"} className="flex-shrink-0">
                    {b.status === "confirmed" ? "Terkonfirmasi" : "Menunggu"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button asChild className="gap-2"><Link href="/mentor/jadwal"><CalendarDays className="h-4 w-4" />Atur Jadwal</Link></Button>
        <Button variant="outline" asChild className="gap-2"><Link href="/mentor/klien"><Users className="h-4 w-4" />Daftar Klien</Link></Button>
      </div>
    </div>
  );
}
