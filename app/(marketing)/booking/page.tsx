import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Star, CalendarDays } from "lucide-react";
import KalenderBooking from "@/components/booking/KalenderBooking";
import { createClient } from "@/lib/supabase/server";
import { BRAND } from "@/lib/brand";
import { NavbarUtama } from "@/components/ui/NavbarUtama";
import { formatRupiah } from "@/lib/utils/format-currency";

export const metadata: Metadata = {
  title: "Pesan Jadwal Bimbingan",
  description:
    "Pilih mentor dan jam yang cocok, lalu kerjakan tulisanmu dengan arahan yang jelas. " +
    "Sesi daring maupun tatap muka di Solo.",
};

export const dynamic = "force-dynamic";

type MentorRow = {
  id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  specializations: string[] | null;
  price_per_hour: number;
  experience_years: number;
  session_count: number;
  rating_avg: number;
};


function inisial(nama: string) {
  return nama
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default async function BookingPage({
  searchParams,
}: {
  searchParams: { mentor?: string };
}) {
  const supabase = createClient();

  // Versi sebelumnya memfilter .eq("is_active", true) pada mentor_profiles,
  // kolom yang tidak ada di tabel itu. Error-nya ditelan try/catch kosong,
  // jadi daftar mentor selalu kosong tanpa ada yang menyadari. Kolom yang
  // benar adalah is_available, dan error sekarang dicatat.
  const { data, error } = await supabase
    .from("mentor_profiles")
    .select(
      "id, display_name, bio, avatar_url, specializations, price_per_hour, experience_years, session_count, rating_avg"
    )
    .eq("is_available", true)
    .order("session_count", { ascending: false });

  if (error) console.error("[booking] gagal memuat mentor:", error.message);

  const mentors = (data ?? []) as MentorRow[];

  // Kalau datang dari halaman jadwal dengan ?mentor=..., halaman menyempit ke
  // satu mentor saja supaya pilihannya tidak membingungkan.
  const terpilih = searchParams.mentor
    ? mentors.find((m) => m.id === searchParams.mentor)
    : undefined;

  return (
    <div className="min-h-screen bg-white">
      {/* ── Navbar ── */}
      <NavbarUtama />

      <main className="mx-auto max-w-5xl px-4 pb-20">
        {/* ── Tombol kembali ── */}
        <div className="pt-5">
          <Link
            href={terpilih ? "/jadwal" : "/"}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-brand"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {terpilih ? "Kembali ke semua jadwal" : "Kembali ke beranda"}
          </Link>
        </div>

        {/* ── Judul ── */}
        <header className="pb-10 pt-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-0.5 w-8 rounded-full bg-brand" />
            <span className="text-xs font-bold uppercase tracking-widest text-brand">
              Pesan Jadwal
            </span>
          </div>
          <h1 className="mb-3 text-4xl font-extrabold leading-tight text-slate-900 lg:text-5xl">
            {terpilih ? (
              <>
                Jadwal{" "}
                <span className="text-brand">
                  {terpilih.display_name ?? "Mentor"}
                </span>
              </>
            ) : (
              <>
                Pilih mentor dan{" "}
                <span className="text-brand">jam yang cocok</span>
              </>
            )}
          </h1>
          <p className="max-w-xl leading-relaxed text-slate-600">
            Sesi satu jam, daring atau tatap muka di{" "}
            {BRAND.address.split(",")[0]}. Kamu yang menulis; mentor yang
            menunjukkan jalan keluar saat kamu buntu.
          </p>
        </header>

        {/* ── Profil mentor terpilih ── */}
        {terpilih && (
          <section className="mb-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              {terpilih.avatar_url ? (
                <Image
                  src={terpilih.avatar_url}
                  alt={`Foto ${terpilih.display_name}`}
                  width={80}
                  height={80}
                  className="h-20 w-20 flex-shrink-0 rounded-full object-cover ring-2 ring-brand-100"
                />
              ) : (
                <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-brand-50 text-2xl font-extrabold text-brand ring-2 ring-brand-100">
                  {inisial(terpilih.display_name ?? "Mentor")}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-extrabold text-slate-900">
                  {terpilih.display_name ?? "Mentor Ruang Konsul"}
                </h2>
                {terpilih.specializations &&
                  terpilih.specializations.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {terpilih.specializations.map((b) => (
                        <span
                          key={b}
                          className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand"
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  )}
                {terpilih.bio && (
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600">
                    {terpilih.bio}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-5 border-t border-slate-100 pt-3 text-sm">
                  <span className="flex items-center gap-1.5 font-semibold text-slate-900">
                    <Star
                      className="h-4 w-4 fill-brand text-brand"
                      aria-hidden="true"
                    />
                    {terpilih.rating_avg > 0 ? terpilih.rating_avg : "Baru"}
                  </span>
                  <span className="font-medium text-slate-600">
                    {terpilih.session_count} sesi selesai
                  </span>
                  <span className="font-medium text-slate-600">
                    {terpilih.experience_years} tahun pengalaman
                  </span>
                  <span className="ml-auto text-lg font-extrabold text-brand">
                    {formatRupiah(terpilih.price_per_hour)}
                    <span className="text-xs font-normal text-slate-400">
                      {" "}
                      / sesi
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Daftar mentor (saat tidak menyaring satu mentor) ── */}
        {!terpilih && mentors.length > 0 && (
          <section className="mb-12" aria-labelledby="mentor">
            <h2
              id="mentor"
              className="mb-5 text-2xl font-extrabold text-slate-900"
            >
              Mentor tersedia
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {mentors.map((m) => (
                <Link
                  key={m.id}
                  href={`/booking?mentor=${m.id}`}
                  className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-brand hover:bg-brand-50"
                >
                  {m.avatar_url ? (
                    <Image
                      src={m.avatar_url}
                      alt={`Foto ${m.display_name}`}
                      width={56}
                      height={56}
                      className="h-14 w-14 flex-shrink-0 rounded-full object-cover ring-2 ring-brand-100"
                    />
                  ) : (
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-brand-50 text-lg font-extrabold text-brand ring-2 ring-brand-100">
                      {inisial(m.display_name ?? "Mentor")}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900">
                      {m.display_name ?? "Mentor Ruang Konsul"}
                    </h3>
                    <p className="mt-0.5 text-sm font-semibold text-brand">
                      {formatRupiah(m.price_per_hour)}
                      <span className="text-xs font-normal text-slate-400">
                        {" "}
                        / sesi
                      </span>
                    </p>
                    {m.specializations && m.specializations.length > 0 && (
                      <p className="mt-1 truncate text-xs font-medium text-slate-500">
                        {m.specializations.join(" · ")}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
            <p className="mt-4 text-sm font-medium text-slate-500">
              Atau lihat{" "}
              <Link
                href="/jadwal"
                className="font-semibold text-brand hover:underline"
              >
                seluruh jadwal dalam satu halaman
              </Link>
              .
            </p>
          </section>
        )}

        {/* ── Kalender ── */}
        <section aria-labelledby="jadwal">
          <h2
            id="jadwal"
            className="mb-5 flex items-center gap-2 text-2xl font-extrabold text-slate-900"
          >
            <CalendarDays className="h-6 w-6 text-brand" aria-hidden="true" />
            {terpilih ? "Jadwal tersedia" : "Semua jadwal tersedia"}
          </h2>
          <KalenderBooking mentorId={terpilih?.id} />
        </section>

        <aside className="mt-16 rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
            Bimbingan di Ruang Konsul berarti kamu dibimbing mengerjakan
            tulisanmu sendiri — mentor membantu menajamkan rumusan masalah,
            memilih metode, membaca draf, dan menyiapkanmu menghadapi sidang.
            Kalau yang kamu cari adalah naskah jadi, kami bukan tempatnya.
          </p>
        </aside>
      </main>
    </div>
  );
}
