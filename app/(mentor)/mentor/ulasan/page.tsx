import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { BRAND } from "@/lib/brand";
import { Star, MessageSquare, TrendingUp, ThumbsUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PREVIEW_MODE } from "@/lib/utils/preview-mode";
import type { Metadata } from "next";
export const metadata: Metadata = { title: `Ulasan | ${BRAND.name}` };

interface Review { id: string; name: string; initials: string; rating: number; date: string; sesi: string; comment: string }

const DEMO_REVIEWS: Review[] = [
  { id: "r1", name: "Rizky Aditya", initials: "RA", rating: 5, date: "2 minggu lalu", sesi: "Bimbingan Skripsi", comment: "Mentor sangat sabar dan detail dalam menjelaskan." },
  { id: "r2", name: "Siti Mariyam", initials: "SM", rating: 4, date: "1 bulan lalu", sesi: "Konsultasi Judul", comment: "Membantu banget dalam menentukan judul." },
];

/** Ulasan nyata dari tabel bookings (rating diisi customer setelah sesi selesai). */
async function getReviews(): Promise<Review[]> {
  if (PREVIEW_MODE) return DEMO_REVIEWS;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: mp } = await supabase.from("mentor_profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (!mp) return [];
  const { data } = await supabase
    .from("bookings")
    .select("id, rating, review, topic, completed_at, profiles(full_name)")
    .eq("mentor_id", mp.id)
    .not("rating", "is", null)
    .order("completed_at", { ascending: false })
    .limit(100);
  return (data ?? []).map((b: any) => {
    const name: string = (Array.isArray(b.profiles) ? b.profiles[0] : b.profiles)?.full_name || "Klien";
    return {
      id: b.id,
      name,
      initials: name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase(),
      rating: b.rating,
      date: b.completed_at ? new Date(b.completed_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "",
      sesi: b.topic ?? "Bimbingan",
      comment: b.review ?? "",
    };
  });
}

function renderStars(rating: number) {
  return Array.from({ length: 5 }, (_, i) => (
    <Star key={i} className={`h-3.5 w-3.5 ${i < rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
  ));
}

export default async function UlasanPage() {
  const REVIEWS = await getReviews();
  const avgRating = REVIEWS.length ? REVIEWS.reduce((s, r) => s + r.rating, 0) / REVIEWS.length : 0;
  const totalReviews = REVIEWS.length;
  const ratingDist = [5, 4, 3, 2, 1].map(r => ({
    stars: r,
    count: REVIEWS.filter(rv => rv.rating === r).length,
    pct: totalReviews ? Math.round((REVIEWS.filter(rv => rv.rating === r).length / totalReviews) * 100) : 0,
  }));

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Ulasan Klien</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Feedback dari klien yang pernah bimbingan denganmu.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 text-center">
          <p className="text-4xl font-extrabold text-[#8B0000]">{avgRating.toFixed(1)}</p>
          <div className="flex items-center justify-center gap-0.5 mt-2">
            {renderStars(Math.round(avgRating))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">{totalReviews} ulasan</p>
        </Card>
        <Card className="p-5 col-span-2">
          <div className="space-y-2">
            {ratingDist.map((r) => (
              <div key={r.stars} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-16 flex-shrink-0">
                  <span className="text-xs font-semibold text-slate-700">{r.stars}</span>
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                </div>
                <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-2 rounded-full bg-amber-400" style={{ width: `${r.pct}%` }} />
                </div>
                <span className="text-xs text-muted-foreground w-8 text-right flex-shrink-0">{r.count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Reviews list */}
      <div className="space-y-4">
        {REVIEWS.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground">Belum ada ulasan. Ulasan muncul setelah klien menilai sesi yang selesai.</Card>
        )}
        {REVIEWS.map((r) => (
          <Card key={r.id} className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-gradient text-white text-xs font-bold flex-shrink-0">
                {r.initials}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-sm font-semibold text-slate-900">{r.name}</p>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{r.date}</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-0.5">{renderStars(r.rating)}</div>
                  <Badge variant="muted" className="text-[10px]">{r.sesi}</Badge>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{r.comment}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* CTA */}
      <div className="flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-5">
        <TrendingUp className="h-5 w-5 text-[#8B0000] flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900">Mau tingkatkan rating?</p>
          <p className="text-xs text-muted-foreground mt-0.5">Minta ulasan dari klien setelah sesi bimbingan selesai untuk meningkatkan visibilitas-mu.</p>
        </div>
      </div>
    </div>
  );
}
