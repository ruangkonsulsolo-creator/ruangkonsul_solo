import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, MessageSquare, Star, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { KalenderJadwal, type SesiJadwal } from "@/components/mentor/KalenderJadwal";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: `Dashboard Mentor | ${BRAND.name}` };
export const dynamic = "force-dynamic";

/**
 * Dashboard mentor.
 *
 * Jadwalnya berbentuk kalender, bukan daftar memanjang: pertanyaan yang
 * paling sering muncul sebelum menyetujui booking adalah "hari apa saya
 * masih kosong", dan daftar tidak pernah menjawab itu sekali lihat.
 *
 * Semua angka di sini dihitung dari baris yang benar-benar ada. Tidak ada
 * nilai contoh yang ditanam di kode — panel yang menampilkan "47 sesi" pada
 * mentor yang belum punya klien membuat seluruh panel kehilangan kepercayaan.
 */
export default async function DashboardMentorPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: mentor } = await supabase
    .from("mentor_profiles")
    .select("id, rating_avg, session_count, is_available, price_per_hour, avatar_url")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: profil } = await supabase
    .from("profiles").select("full_name").eq("id", user.id).maybeSingle();

  if (!mentor) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="font-extrabold text-amber-900">Profil mentor belum aktif</h2>
        <p className="mt-2 text-sm leading-relaxed text-amber-800">
          Akun ini punya peran mentor, tapi belum punya baris profil mentor.
          Admin perlu membuatkannya lebih dulu lewat panel Kinerja Mentor.
        </p>
      </div>
    );
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      `id, status, notes,
       slot:booking_slots!bookings_slot_id_fkey ( slot_date, slot_start, slot_end ),
       klien:profiles!bookings_customer_id_fkey ( full_name )`
    )
    .eq("mentor_id", mentor.id)
    .order("created_at", { ascending: false })
    .limit(400);

  const sesi: SesiJadwal[] = (booking ?? [])
    .map((b): SesiJadwal | null => {
      const s = b.slot as unknown as {
        slot_date: string; slot_start: string; slot_end: string;
      } | null;
      const k = b.klien as unknown as { full_name: string | null } | null;
      if (!s) return null;
      // Slot disimpan sebagai tanggal dan jam lokal WIB, jadi offset +07:00
      // ditulis eksplisit. Tanpa itu, Date menafsirkannya sebagai UTC dan
      // seluruh jadwal bergeser tujuh jam.
      return {
        id: b.id,
        mulai: `${s.slot_date}T${s.slot_start}+07:00`,
        selesai: `${s.slot_date}T${s.slot_end}+07:00`,
        namaKlien: k?.full_name ?? "Klien",
        status: b.status as SesiJadwal["status"],
        catatan: b.notes ?? undefined,
      };
    })
    .filter((x): x is SesiJadwal => x !== null);

  const kiniWib = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());

  const hariIni = sesi.filter((s) => s.mulai.slice(0, 10) === kiniWib).length;
  const menunggu = sesi.filter((s) => s.status === "pending").length;
  const klienUnik = new Set(sesi.map((s) => s.namaKlien)).size;

  const kartu = [
    { icon: CalendarDays, nilai: String(hariIni), label: "Sesi hari ini" },
    { icon: Users, nilai: String(klienUnik), label: "Klien" },
    { icon: Star, nilai: mentor.rating_avg > 0 ? Number(mentor.rating_avg).toFixed(1) : "—", label: "Rating" },
    { icon: MessageSquare, nilai: String(menunggu), label: "Menunggu konfirmasi" },
  ];

  return (
    <div className="space-y-5">
      {!mentor.avatar_url && (
        <Link href="/mentor/profil"
          className="flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 hover:bg-red-100">
          <span><b>Foto profil wajib diunggah.</b> Kartu mentormu di beranda masih tampil tanpa foto.</span>
          <span className="shrink-0 font-bold">Unggah foto →</span>
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">
            Halo, {profil?.full_name ?? "Mentor"}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {sesi.length === 0
              ? "Belum ada sesi terjadwal."
              : `${sesi.length} sesi tercatat sejauh ini.`}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            mentor.is_available
              ? "bg-green-50 text-green-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {mentor.is_available ? "Menerima booking" : "Tidak menerima booking"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kartu.map((k) => (
          <div key={k.label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
              <k.icon className="h-4 w-4 text-brand" aria-hidden="true" />
            </span>
            <p className="text-2xl font-extrabold text-slate-900">{k.nilai}</p>
            <p className="text-xs text-slate-500">{k.label}</p>
          </div>
        ))}
      </div>

      <KalenderJadwal sesi={sesi} />

      <div className="flex flex-wrap gap-2">
        {[
          ["Kelola jadwal", "/mentor/jadwal"],
          ["Chat klien", "/mentor/chat"],
          ["Ulasan", "/mentor/ulasan"],
          ["Profil mentor", "/mentor/profil"],
        ].map(([label, href]) => (
          <Link key={href} href={href}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:border-brand hover:text-brand">
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
