import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PREVIEW_MODE, PREVIEW_USER } from "@/lib/utils/preview-mode";
import { BRAND } from "@/lib/brand";
import { formatRupiah } from "@/lib/utils/format-currency";
import { Star, Users, Clock, CheckCircle2, GraduationCap, DollarSign, Edit3 } from "lucide-react";
import type { Metadata } from "next";
export const metadata: Metadata = { title: `Profil Mentor | ${BRAND.name}` };

const SPECIALIZATIONS = ["Skripsi S1", "Tesis S2", "Disertasi S3", "Data Analysis", "Metodologi Riset", "Lomba Karya Tulis", "Publikasi Jurnal"];

async function getData() {
  if (PREVIEW_MODE) {
    return {
      full_name: "Preview Mentor",
      email: "preview@ruangkonsulsolo.id",
      bio: "Mentor akademik berpengalaman 5+ tahun membantu mahasiswa S1 & S2 dalam penyusunan skripsi dan tesis.",
      specializations: ["Skripsi S1", "Tesis S2", "Metodologi Riset"],
      price_per_hour: 150000,
      is_available: true,
      session_count: 47,
      rating_avg: 4.9,
      rating_count: 38,
    };
  }
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const { redirect } = await import("next/navigation");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    const { data: profile } = await supabase.from("profiles").select("full_name, email, role").eq("id", user!.id).single();
    if (!profile || !["mentor","admin","superadmin"].includes(profile.role)) redirect("/dashboard");
    const { data: mp } = await supabase.from("mentor_profiles").select("id, bio, specializations, price_per_hour, is_available, session_count, rating_avg, rating_count").eq("user_id", user!.id).single();
    return {
      full_name: profile!.full_name,
      email: profile!.email ?? "",
      bio: mp?.bio ?? "",
      specializations: (mp?.specializations as string[]) ?? [],
      price_per_hour: mp?.price_per_hour ?? 0,
      is_available: mp?.is_available ?? false,
      session_count: mp?.session_count ?? 0,
      rating_avg: mp?.rating_avg ?? 0,
      rating_count: mp?.rating_count ?? 0,
    };
  } catch {
    return { full_name: "Mentor", email: "", bio: "", specializations: [], price_per_hour: 0, is_available: false, session_count: 0, rating_avg: 0, rating_count: 0 };
  }
}

export default async function MentorProfilPage() {
  const data = await getData();

  const stats = [
    { icon: Users,       label: "Total Sesi",   value: data.session_count },
    { icon: Star,        label: "Rating",        value: `${data.rating_avg > 0 ? data.rating_avg.toFixed(1) : "—"}${data.rating_count > 0 ? ` (${data.rating_count})` : ""}` },
    { icon: DollarSign,  label: "Tarif/Jam",     value: data.price_per_hour > 0 ? formatRupiah(data.price_per_hour) : "Belum diatur" },
    { icon: Clock,       label: "Status",        value: data.is_available ? "Tersedia" : "Tidak Aktif" },
  ];

  return (
    <div className="space-y-7 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Profil Mentor</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Kelola informasi profil yang ditampilkan ke klien.</p>
        </div>
        <Button className="gap-2">
          <Edit3 className="h-3.5 w-3.5" />
          Edit Profil
        </Button>
      </div>

      {/* Profile header */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-gradient text-white text-xl font-extrabold flex-shrink-0">
            {data.full_name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900">{data.full_name}</h3>
            <p className="text-sm text-muted-foreground">{data.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={data.is_available ? "success" : "muted"}>
                {data.is_available ? "Tersedia" : "Tidak Aktif"}
              </Badge>
              <Badge variant="info">Mentor</Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 mb-3">
                <Icon className="h-5 w-5 text-[#8B0000]" />
              </div>
              <p className="text-lg font-extrabold text-slate-900">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </Card>
          );
        })}
      </div>

      {/* Bio */}
      <Card className="p-6">
        <h3 className="text-sm font-bold text-slate-900 mb-3">Bio / Deskripsi</h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          {data.bio || "Belum ada bio. Tambahkan bio untuk membantu klien mengenal kamu lebih baik."}
        </p>
      </Card>

      {/* Specializations */}
      <Card className="p-6">
        <h3 className="text-sm font-bold text-slate-900 mb-3">Spesialisasi</h3>
        <div className="flex flex-wrap gap-2">
          {data.specializations.length > 0 ? (
            data.specializations.map((s) => (
              <Badge key={s} variant="info" className="gap-1.5">
                <GraduationCap className="h-3 w-3" />
                {s}
              </Badge>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Belum ada spesialisasi dipilih.</p>
          )}
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-xs text-muted-foreground mb-2">Pilihan spesialisasi:</p>
          <div className="flex flex-wrap gap-2">
            {SPECIALIZATIONS.map((s) => (
              <span
                key={s}
                className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                  data.specializations.includes(s)
                    ? "border-brand bg-brand-50 text-[#8B0000]"
                    : "border-slate-200 text-slate-500"
                }`}
              >
                {data.specializations.includes(s) && <CheckCircle2 className="inline h-3 w-3 mr-1" />}
                {s}
              </span>
            ))}
          </div>
        </div>
      </Card>

      {/* Tarif & Availability */}
      <Card className="p-6">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Tarif & Ketersediaan</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700">Tarif per Jam</p>
              <p className="text-xs text-muted-foreground">Harga sesi bimbingan 1 jam</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-extrabold text-[#8B0000]">
                {data.price_per_hour > 0 ? formatRupiah(data.price_per_hour) : "Belum diatur"}
              </p>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700">Status Ketersediaan</p>
              <p className="text-xs text-muted-foreground">Klien hanya bisa booking saat kamu tersedia</p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${data.is_available ? "bg-green-500" : "bg-slate-400"}`} />
              <span className={`text-sm font-bold ${data.is_available ? "text-green-700" : "text-slate-500"}`}>
                {data.is_available ? "Tersedia" : "Tidak Aktif"}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
