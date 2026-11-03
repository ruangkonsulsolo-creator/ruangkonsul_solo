import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ArrowRight, ArrowLeft, Star, Clock, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { TombolAkun } from "@/components/ui/TombolAkun";
import { createClient } from "@/lib/supabase/server";
import { BRAND, waLink } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Jadwal Bimbingan | ${BRAND.name}`,
  description:
    "Lihat seluruh jadwal mentor Ruang Konsul Solo dalam satu halaman. " +
    "Pilih mentor dan jam yang cocok, lalu pesan sesimu.",
};

export const dynamic = "force-dynamic";

type SlotRow = {
  slot_id: string;
  mentor_id: string;
  mentor_name: string | null;
  avatar_url: string | null;
  specializations: string[] | null;
  slot_date: string;
  slot_start: string;
  price_per_hour: number;
};

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const hariPanjang = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Asia/Jakarta",
});

const jam = (t: string) => t.slice(0, 5).replace(":", ".");

export default async function JadwalPage() {
  const supabase = createClient();

  // Ambil 14 hari ke depan sekaligus untuk semua mentor, lalu kelompokkan.
  // Satu query untuk seluruh halaman, bukan satu query per mentor.
  const { data, error } = await supabase
    .from("available_slots")
    .select(
      "slot_id, mentor_id, mentor_name, avatar_url, specializations, slot_date, slot_start, price_per_hour"
    )
    .order("slot_date", { ascending: true })
    .order("slot_start", { ascending: true })
    .limit(1000);

  if (error) console.error("[jadwal] gagal memuat slot:", error.message);

  const slots = (data ?? []) as SlotRow[];

  // Ringkasan per mentor: berapa slot, jadwal terdekat, rentang harga.
  const perMentor = new Map<
    string,
    {
      id: string;
      nama: string;
      foto: string | null;
      bidang: string[];
      harga: number;
      jumlah: number;
      terdekat: SlotRow;
    }
  >();

  for (const s of slots) {
    const ada = perMentor.get(s.mentor_id);
    if (ada) {
      ada.jumlah += 1;
    } else {
      perMentor.set(s.mentor_id, {
        id: s.mentor_id,
        nama: s.mentor_name ?? "Mentor Ruang Konsul",
        foto: s.avatar_url,
        bidang: s.specializations ?? [],
        harga: s.price_per_hour,
        jumlah: 1,
        terdekat: s,
      });
    }
  }

  const mentors = Array.from(perMentor.values()).sort(
    (a, b) => b.jumlah - a.jumlah
  );

  // Pengelompokan per tanggal untuk tampilan "jadwal terdekat".
  const perTanggal = new Map<string, SlotRow[]>();
  for (const s of slots.slice(0, 400)) {
    const bucket = perTanggal.get(s.slot_date) ?? [];
    bucket.push(s);
    perTanggal.set(s.slot_date, bucket);
  }
  const tanggalTerdekat = Array.from(perTanggal.entries()).slice(0, 5);

  return (
    <div className="min-h-screen bg-white">
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Logo href="/" size="sm" />
          <div className="flex items-center gap-2">
            <TombolAkun />
          </div>
        </div>
      </nav>

      {/* ── Tombol kembali ── */}
      <div className="mx-auto max-w-6xl px-4 pt-5">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-brand"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Kembali ke beranda
        </Link>
      </div>

      {/* ── Judul ── */}
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-6">
        <div className="mb-3 flex items-center gap-2">
          <span className="h-0.5 w-8 rounded-full bg-brand" />
          <span className="text-xs font-bold uppercase tracking-widest text-brand">
            Jadwal Bimbingan
          </span>
        </div>
        <h1 className="mb-3 text-4xl font-extrabold leading-tight text-slate-900 lg:text-5xl">
          Semua jadwal mentor,{" "}
          <span className="text-brand">dalam satu halaman</span>
        </h1>
        <p className="max-w-xl leading-relaxed text-slate-500">
          Bandingkan mentor, bidang, dan jam yang tersedia. Pilih yang cocok, lalu
          pesan sesimu. Semua jam dalam WIB.
        </p>
      </section>

      {mentors.length === 0 ? (
        <section className="mx-auto max-w-2xl px-4 pb-24">
          <div className="rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50 p-10 text-center">
            <CalendarDays
              className="mx-auto mb-3 h-10 w-10 text-brand"
              aria-hidden="true"
            />
            <h2 className="mb-2 text-xl font-extrabold text-slate-900">
              Belum ada jadwal terbuka
            </h2>
            <p className="mb-5 text-sm text-slate-600">
              Mentor sedang menyusun jadwal baru. Hubungi admin lewat WhatsApp
              untuk mencari waktu yang cocok.
            </p>
            <Button asChild>
              <a href={waLink("Halo, saya ingin menanyakan jadwal bimbingan.")}>
                Tanya lewat WhatsApp
              </a>
            </Button>
          </div>
        </section>
      ) : (
        <>
          {/* ── Pilih mentor ── */}
          <section className="mx-auto max-w-6xl px-4 pb-16">
            <h2 className="mb-6 text-2xl font-extrabold text-slate-900">
              Pilih mentor
            </h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {mentors.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-card transition-colors hover:border-brand-200"
                >
                  <div className="flex items-start gap-4">
                    {m.foto ? (
                      <Image
                        src={m.foto}
                        alt={`Foto ${m.nama}`}
                        width={64}
                        height={64}
                        className="h-16 w-16 flex-shrink-0 rounded-full object-cover ring-2 ring-brand-100"
                      />
                    ) : (
                      <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-brand-50 text-xl font-extrabold text-brand ring-2 ring-brand-100">
                        {m.nama
                          .split(" ")
                          .slice(0, 2)
                          .map((w) => w[0])
                          .join("")
                          .toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-bold leading-tight text-slate-900">
                        {m.nama}
                      </h3>
                      <p className="mt-0.5 text-sm font-semibold text-brand">
                        {rupiah.format(m.harga)}
                        <span className="text-xs font-normal text-slate-400">
                          {" "}
                          / sesi
                        </span>
                      </p>
                    </div>
                  </div>

                  {m.bidang.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {m.bidang.slice(0, 3).map((b) => (
                        <span
                          key={b}
                          className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand"
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  )}

                  <dl className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <CalendarDays
                        className="h-4 w-4 text-brand"
                        aria-hidden="true"
                      />
                      <span>
                        <strong className="font-semibold text-slate-900">
                          {m.jumlah}
                        </strong>{" "}
                        slot tersedia
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Clock className="h-4 w-4 text-brand" aria-hidden="true" />
                      <span>
                        Terdekat{" "}
                        {hariPanjang.format(
                          new Date(`${m.terdekat.slot_date}T00:00:00+07:00`)
                        )}
                        , {jam(m.terdekat.slot_start)} WIB
                      </span>
                    </div>
                  </dl>

                  <Link
                    href={`/booking?mentor=${m.id}`}
                    className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-light"
                  >
                    Lihat jadwal {m.nama.split(" ")[0]}{" "}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              ))}
            </div>
          </section>

          {/* ── Jadwal terdekat lintas mentor ── */}
          <section className="bg-slate-50 px-4 py-16">
            <div className="mx-auto max-w-6xl">
              <h2 className="mb-2 text-2xl font-extrabold text-slate-900">
                Jadwal terdekat
              </h2>
              <p className="mb-8 text-slate-500">
                Lima hari terdekat dari seluruh mentor. Klik jamnya untuk langsung
                memesan.
              </p>

              <div className="space-y-6">
                {tanggalTerdekat.map(([tanggal, isi]) => (
                  <div
                    key={tanggal}
                    className="rounded-2xl border border-slate-200 bg-white p-5"
                  >
                    <h3 className="mb-4 font-extrabold text-slate-900">
                      {hariPanjang.format(new Date(`${tanggal}T00:00:00+07:00`))}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {isi.slice(0, 24).map((s) => (
                        <Link
                          key={s.slot_id}
                          href={`/booking?mentor=${s.mentor_id}&tanggal=${s.slot_date}`}
                          className="group rounded-xl border border-slate-200 px-3 py-2 text-sm transition-colors hover:border-brand hover:bg-brand-50"
                        >
                          <span className="font-semibold text-slate-900">
                            {jam(s.slot_start)}
                          </span>
                          <span className="ml-2 text-xs font-medium text-slate-500 group-hover:text-brand">
                            {(s.mentor_name ?? "Mentor").split(" ")[0]}
                          </span>
                        </Link>
                      ))}
                      {isi.length > 24 && (
                        <span className="self-center text-xs font-medium text-slate-500">
                          +{isi.length - 24} jam lainnya
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {/* ── CTA ── */}
      <section className="px-4 py-14">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-5 rounded-3xl bg-brand p-10 shadow-card sm:flex-row lg:p-12">
          <div className="text-center sm:text-left">
            <h2 className="mb-1.5 text-2xl font-extrabold text-white lg:text-3xl">
              Belum yakin pilih yang mana?
            </h2>
            <p className="text-sm text-white/75">
              Ceritakan kendalamu lewat WhatsApp, admin bantu carikan mentor yang
              cocok.
            </p>
          </div>
          <Button variant="dark" size="lg" asChild className="flex-shrink-0">
            <a
              href={waLink("Halo, saya bingung memilih mentor bimbingan.")}
              className="gap-2"
            >
              Konsultasi Gratis <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </section>
    </div>
  );
}
