import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { daftarSesi } from "@/lib/sesi/daftar";
import { TabelSesi } from "@/components/sesi/TabelSesi";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Sesi & Klien | ${BRAND.name}` };

const FILTER: Array<[string, string]> = [
  ["confirmed", "Akan datang"],
  ["completed", "Selesai"],
  ["menunggu_bayar", "Menunggu Bayar"],
  ["semua", "Semua"],
];

/**
 * Versi sebelumnya meng-embed `profiles(...)` dan `booking_slots(...)` tanpa
 * nama relasi. Tabel bookings punya dua FK ke booking_slots (slot_id dan
 * rescheduled_from), sehingga PostgREST menolak query-nya dan daftar klien
 * selalu kosong. Mentor juga tidak punya akses RLS ke profil customer, jadi
 * data dibaca lewat service role SETELAH kepemilikan mentor dipastikan.
 */
export default async function KlienMentorPage({ searchParams }: { searchParams: { status?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/mentor/klien");

  const { data: mentorProfile } = await supabase
    .from("mentor_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const status = FILTER.some(([k]) => k === searchParams.status) ? searchParams.status! : "confirmed";
  const rows = mentorProfile ? await daftarSesi({ mentorId: mentorProfile.id, status }) : [];

  return (
    <div className="max-w-6xl space-y-5">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Sesi &amp; Klien</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Sesi yang sudah dibayar klien. Baca request-nya, lalu kirim link meeting — klien dikabari otomatis.
        </p>
      </div>
      {!mentorProfile && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Profil mentor untuk akun ini belum dibuat. Hubungi admin.
        </p>
      )}
      <div className="flex flex-wrap gap-2 text-xs">
        {FILTER.map(([k, label]) => (
          <a key={k} href={`?status=${k}`} className={`rounded-full border px-3 py-1 ${status === k ? "bg-slate-900 text-white" : "bg-white"}`}>
            {label}
          </a>
        ))}
      </div>
      <TabelSesi rows={rows} tampilMentor={false} bolehBatal={false} />
    </div>
  );
}
