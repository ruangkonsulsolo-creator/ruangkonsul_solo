import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowLeft, ArrowRight, Award, Briefcase, GraduationCap,
  Linkedin, Star, Clock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BRAND } from "@/lib/brand";
import { NavbarUtama } from "@/components/ui/NavbarUtama";

export const revalidate = 300;

type Pengalaman = {
  posisi?: string; instansi?: string; mulai?: string;
  selesai?: string; catatan?: string;
};
type Pendidikan = {
  jenjang?: string; program?: string; kampus?: string; tahun?: string;
};

const KOLOM =
  `id, bio, headline, gelar, education, specializations, experience_years,
   is_available, avatar_url, linkedin_url, pencapaian, pengalaman,
   pendidikan, rating_avg, session_count,
   profil:profiles!mentor_profiles_user_id_fkey ( full_name )`;

async function ambil(id: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("mentor_profiles").select(KOLOM).eq("id", id).maybeSingle();
  if (!data) return null;
  const p = data.profil as unknown as { full_name: string | null } | null;
  return { ...data, nama: p?.full_name?.trim() || "Mentor" };
}

export async function generateMetadata({
  params,
}: { params: { id: string } }): Promise<Metadata> {
  const m = await ambil(params.id);
  if (!m) return { title: "Mentor tidak ditemukan" };
  return {
    title: `${m.nama} — Mentor`,
    description:
      (m.headline as string | null) ??
      `Profil ${m.nama}, mentor di ${BRAND.name}.`,
  };
}

function Bagian({
  ikon: Ikon, judul, anak,
}: { ikon: typeof Award; judul: string; anak: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="mb-4 flex items-center gap-2 font-extrabold text-slate-900">
        <Ikon className="h-4 w-4 text-brand" aria-hidden="true" />
        {judul}
      </h2>
      {anak}
    </section>
  );
}

export default async function HalamanMentor({
  params,
}: { params: { id: string } }) {
  const m = await ambil(params.id);
  if (!m) notFound();

  const bidang = (m.specializations as string[] | null) ?? [];
  const pencapaian = (m.pencapaian as string[] | null) ?? [];
  const pengalaman = (m.pengalaman as Pengalaman[] | null) ?? [];
  const pendidikan = (m.pendidikan as Pendidikan[] | null) ?? [];
  const rating = Number(m.rating_avg ?? 0);
  const sesi = Number(m.session_count ?? 0);
  const tahun = Number(m.experience_years ?? 0);

  const inisial = m.nama.split(/\s+/).filter(Boolean).slice(0, 2)
    .map((x: string) => x[0]).join("").toUpperCase();

  // Angka hanya ditampilkan kalau sudah ada isinya. Mentor baru yang
  // memamerkan "0 sesi · rating 0" terlihat lebih buruk daripada mentor
  // yang tidak memamerkan angka sama sekali.
  const angka = [
    rating > 0 && { label: "Rating", nilai: rating.toFixed(1), ikon: Star },
    sesi > 0 && { label: "Sesi selesai", nilai: String(sesi), ikon: Clock },
    tahun > 0 && { label: "Tahun pengalaman", nilai: String(tahun), ikon: Briefcase },
  ].filter(Boolean) as { label: string; nilai: string; ikon: typeof Star }[];

  return (
    <div className="min-h-screen bg-white">
      <NavbarUtama />

      {/* ── Kepala profil ── */}
      <header className="bg-brand-50 px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/mentor-kami"
            className="mb-5 inline-flex items-center gap-1.5 text-sm font-bold text-slate-600 hover:text-brand"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Semua mentor
          </Link>

          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            {m.avatar_url ? (
              <Image
                src={m.avatar_url as string}
                alt={`Foto ${m.nama}`}
                width={128}
                height={128}
                className="h-28 w-28 flex-shrink-0 rounded-2xl object-cover ring-4 ring-white"
              />
            ) : (
              <span className="flex h-28 w-28 flex-shrink-0 items-center justify-center rounded-2xl bg-brand text-3xl font-extrabold text-white ring-4 ring-white">
                {inisial}
              </span>
            )}

            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-extrabold leading-tight text-slate-900 lg:text-3xl">
                {m.nama}
                {m.gelar ? (
                  <span className="ml-2 text-lg font-bold text-slate-500">
                    {m.gelar as string}
                  </span>
                ) : null}
              </h1>

              {m.headline ? (
                <p className="mt-1 font-semibold text-brand">{m.headline as string}</p>
              ) : null}
              {m.education ? (
                <p className="mt-1 text-sm text-slate-600">{m.education as string}</p>
              ) : null}

              {bidang.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {bidang.map((b) => (
                    <li key={b} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand">
                      {b}
                    </li>
                  ))}
                </ul>
              )}

              {angka.length > 0 && (
                <dl className="mt-4 flex flex-wrap gap-x-7 gap-y-2">
                  {angka.map((a) => (
                    <div key={a.label}>
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {a.label}
                      </dt>
                      <dd className="flex items-center gap-1 text-xl font-extrabold text-slate-900">
                        <a.ikon className="h-4 w-4 text-brand" aria-hidden="true" />
                        {a.nilai}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                {m.is_available ? (
                  <Link
                    href={`/booking?mentor=${m.id}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-light"
                  >
                    Pesan jadwal <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                ) : (
                  <span className="inline-flex items-center rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-500">
                    Sedang tidak menerima booking
                  </span>
                )}
                {m.linkedin_url ? (
                  <a
                    href={m.linkedin_url as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:border-brand hover:text-brand"
                  >
                    <Linkedin className="h-4 w-4" aria-hidden="true" />
                    LinkedIn
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Isi ── */}
      <div className="mx-auto max-w-5xl space-y-5 px-4 py-10">
        {m.bio ? (
          <Bagian
            ikon={GraduationCap}
            judul="Tentang"
            anak={
              <p className="whitespace-pre-wrap leading-relaxed text-slate-700">
                {m.bio as string}
              </p>
            }
          />
        ) : null}

        {pencapaian.length > 0 && (
          <Bagian
            ikon={Award}
            judul="Pencapaian"
            anak={
              <ul className="space-y-2">
                {pencapaian.map((x, i) => (
                  <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-slate-700">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand" />
                    {x}
                  </li>
                ))}
              </ul>
            }
          />
        )}

        {pengalaman.length > 0 && (
          <Bagian
            ikon={Briefcase}
            judul="Pengalaman"
            anak={
              // Garis waktu: titik dan garis penghubung membuat urutan
              // terbaca sekali lihat, tanpa pembaca harus membandingkan
              // tahun satu per satu.
              <ol className="space-y-5">
                {pengalaman.map((x, i) => (
                  <li key={i} className="relative pl-6">
                    <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-brand" />
                    {i < pengalaman.length - 1 && (
                      <span className="absolute left-[4px] top-5 h-full w-0.5 bg-slate-100" />
                    )}
                    <p className="font-bold text-slate-900">{x.posisi || "—"}</p>
                    <p className="text-sm text-slate-600">{x.instansi}</p>
                    {(x.mulai || x.selesai) && (
                      <p className="mt-0.5 text-xs text-slate-400">
                        {[x.mulai, x.selesai].filter(Boolean).join(" – ")}
                      </p>
                    )}
                    {x.catatan && (
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                        {x.catatan}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            }
          />
        )}

        {pendidikan.length > 0 && (
          <Bagian
            ikon={GraduationCap}
            judul="Perjalanan Pendidikan"
            anak={
              <ol className="space-y-4">
                {pendidikan.map((x, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-0.5 flex h-9 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-xs font-extrabold text-brand">
                      {x.jenjang || "—"}
                    </span>
                    <span>
                      <span className="block font-bold text-slate-900">{x.program}</span>
                      <span className="block text-sm text-slate-600">{x.kampus}</span>
                      {x.tahun && (
                        <span className="block text-xs text-slate-400">{x.tahun}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            }
          />
        )}

        {/* Kalau mentornya belum mengisi apa pun, halaman tidak boleh terasa
            rusak — katakan apa adanya, jangan tampilkan deretan kotak kosong. */}
        {!m.bio && pencapaian.length === 0 && pengalaman.length === 0 &&
         pendidikan.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center">
            <p className="font-semibold text-slate-900">Biodata belum dilengkapi</p>
            <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-slate-500">
              Mentor ini belum mengisi profil lengkapnya. Kamu tetap bisa
              memesan sesi, atau tanyakan dulu lewat chat setelah masuk.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
