import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Star, CalendarDays } from "lucide-react";
import { KartuMentor } from "@/components/mentor/KartuMentor";
import { ambilMentorPublik } from "@/lib/mentor/publik";
import KalenderBooking from "@/components/booking/KalenderBooking";
import { createClient } from "@/lib/supabase/server";
import { BRAND } from "@/lib/brand";
import { NavbarUtama } from "@/components/ui/NavbarUtama";
import { formatRupiah } from "@/lib/utils/format-currency";
import { perluPilihJadwal } from "@/lib/katalog/checkout";

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


export default async function BookingPage({
  searchParams,
}: {
  searchParams: { mentor?: string; produk?: string; tanggal?: string; slot?: string };
}) {
  const supabase = createClient();

  // Datang dari halaman paket "per jam": harga mengikuti paket.
  let paket: { id: string; slug: string; nama: string; harga: number } | undefined;
  if (searchParams.produk) {
    const { data: p } = await supabase
      .from("produk")
      .select("id, slug, nama, harga, harga_mulai, satuan, is_active")
      .eq("slug", searchParams.produk)
      .maybeSingle();
    if (p && p.is_active && !p.harga_mulai && p.harga > 0 && perluPilihJadwal(p)) {
      paket = { id: p.id, slug: p.slug, nama: p.nama, harga: p.harga };
    }
  }
  const qProduk = paket ? `&produk=${encodeURIComponent(paket.slug)}` : "";

  // Semua paket bimbingan per jam — dipilih di langkah konfirmasi.
  const { data: paketRows } = await supabase
    .from("produk")
    .select("id, nama, harga, harga_mulai, satuan, urutan")
    .eq("is_active", true)
    .ilike("satuan", "%jam%")
    .order("urutan", { ascending: true });
  const pilihanPaket = (paketRows ?? [])
    .filter((p) => !p.harga_mulai && p.harga > 0 && perluPilihJadwal(p))
    .map((p) => ({ id: p.id, nama: p.nama, harga: p.harga }));

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

  // Data kartu yang sama dengan beranda (foto, gelar, headline, pendidikan).
  const kartu = new Map((await ambilMentorPublik()).map((k) => [k.id, k]));
  const dataKartu = (m: MentorRow) =>
    kartu.get(m.id) ?? {
      id: m.id,
      nama: m.display_name ?? "Mentor",
      gelar: "",
      headline: "",
      kampus: "",
      pendidikanTerakhir: "",
      bidang: m.specializations ?? [],
      foto: m.avatar_url,
      rating: Number(m.rating_avg ?? 0),
      sesi: m.session_count,
      pengalamanTahun: m.experience_years,
      tersedia: true,
      inisial: (m.display_name ?? "M").split(/\s+/).slice(0, 2).map((x) => x[0]).join("").toUpperCase(),
    };

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

        {paket && (
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-5 py-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-brand">Paket dipilih</p>
              <p className="font-extrabold text-slate-900">{paket.nama}</p>
            </div>
            <p className="text-lg font-extrabold text-brand">
              {formatRupiah(paket.harga)}
              <span className="text-xs font-normal text-slate-500"> / jam</span>
            </p>
          </div>
        )}

        {/* ── Profil mentor terpilih: kartu berfoto seperti di beranda + bio ── */}
        {terpilih && (
          <section className="mb-12 grid gap-6 sm:grid-cols-[minmax(0,240px)_1fr] sm:items-start">
            <div className="mx-auto w-full max-w-[240px] sm:mx-0">
              <KartuMentor m={dataKartu(terpilih)} aksi="profil" />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-brand">Mentor dipilih</p>
              <h2 className="mt-1 text-xl font-extrabold text-slate-900 sm:text-2xl">
                {(() => {
                  const k = dataKartu(terpilih);
                  return k.gelar ? `${k.nama}, ${k.gelar}` : k.nama;
                })()}
              </h2>
              {terpilih.specializations && terpilih.specializations.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {terpilih.specializations.map((b) => (
                    <span key={b} className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand">
                      {b}
                    </span>
                  ))}
                </div>
              )}
              {terpilih.bio && (
                <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-600">{terpilih.bio}</p>
              )}
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-sm">
                <span className="flex items-center gap-1.5 font-semibold text-slate-900">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                  {terpilih.rating_avg > 0 ? terpilih.rating_avg.toFixed(1) : "Baru"}
                </span>
                <span className="font-medium text-slate-600">{terpilih.session_count} sesi selesai</span>
                {terpilih.experience_years > 0 && (
                  <span className="font-medium text-slate-600">{terpilih.experience_years}+ tahun pengalaman</span>
                )}
                <span className="text-lg font-extrabold text-brand sm:ml-auto">
                  {formatRupiah(paket?.harga ?? terpilih.price_per_hour)}
                  <span className="text-xs font-normal text-slate-400"> / sesi</span>
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
                <a href="#jadwal" className="inline-flex items-center gap-1 text-brand hover:underline">
                  Pilih jam di bawah <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
                <Link href={`/booking${paket ? `?produk=${encodeURIComponent(paket.slug)}` : ""}`} className="text-slate-500 hover:text-brand">
                  Ganti mentor
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ── Daftar mentor (saat tidak menyaring satu mentor) ── */}
        {!terpilih && mentors.length > 0 && (
          <section className="mb-12" aria-labelledby="mentor">
            <h2 id="mentor" className="mb-5 text-2xl font-extrabold text-slate-900">
              Mentor tersedia
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {mentors.map((m) => (
                <KartuMentor
                  key={m.id}
                  m={{ ...dataKartu(m), tersedia: true }}
                  hrefPesan={`/booking?mentor=${m.id}${qProduk}#jadwal`}
                  harga={paket?.harga ?? m.price_per_hour}
                  teksPesan="Pilih mentor ini"
                />
              ))}
            </div>
            <p className="mt-4 text-sm font-medium text-slate-500">
              Atau lihat{" "}
              <Link href="/jadwal" className="font-semibold text-brand hover:underline">
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
            className="mb-5 flex scroll-mt-24 items-center gap-2 text-2xl font-extrabold text-slate-900"
          >
            <CalendarDays className="h-6 w-6 text-brand" aria-hidden="true" />
            {terpilih ? "Jadwal tersedia" : "Semua jadwal tersedia"}
          </h2>
          <KalenderBooking
            mentorId={terpilih?.id}
            paket={paket ? { id: paket.id, nama: paket.nama, harga: paket.harga } : undefined}
            pilihanPaket={pilihanPaket}
            tanggalAwal={searchParams.tanggal}
            slotAwal={searchParams.slot}
          />
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
