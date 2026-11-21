import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ArrowRight, Star, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BRAND } from "@/lib/brand";
import { NavbarUtama } from "@/components/ui/NavbarUtama";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Mentor Kami",
  description:
    `Mentor ${BRAND.name}: latar pendidikan, bidang yang dibimbing, dan ` +
    `pengalaman masing-masing.`,
};

export default async function DaftarMentorPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("mentor_profiles")
    .select(
      `id, gelar, headline, education, specializations, avatar_url,
       rating_avg, session_count, is_available,
       profil:profiles!mentor_profiles_user_id_fkey ( full_name )`
    )
    .order("rating_avg", { ascending: false });

  const mentor = (data ?? []).map((m) => {
    const p = m.profil as unknown as { full_name: string | null } | null;
    const nama = p?.full_name?.trim() || "Mentor";
    return {
      id: m.id as string,
      nama,
      gelar: (m.gelar as string | null) ?? "",
      headline: (m.headline as string | null) ?? "",
      kampus: (m.education as string | null) ?? "",
      bidang: ((m.specializations as string[] | null) ?? []).slice(0, 3),
      foto: (m.avatar_url as string | null) ?? null,
      rating: Number(m.rating_avg ?? 0),
      sesi: Number(m.session_count ?? 0),
      tersedia: Boolean(m.is_available),
      inisial: nama.split(/\s+/).filter(Boolean).slice(0, 2)
        .map((x: string) => x[0]).join("").toUpperCase() || "M",
    };
  });

  return (
    <div className="min-h-screen bg-white">
      <NavbarUtama />

      <section className="bg-brand-50 px-4 py-12 lg:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-0.5 w-8 rounded-full bg-brand" />
            <span className="text-xs font-bold uppercase tracking-widest text-brand">
              Mentor Kami
            </span>
          </div>
          <h1 className="text-3xl font-extrabold leading-tight text-slate-900 lg:text-5xl">
            Yang akan <span className="text-brand">duduk bersamamu</span>
          </h1>
          <p className="mt-3 max-w-xl leading-relaxed text-slate-600">
            Semua mentor pernah melewati proses yang sedang kamu jalani, dan
            terbiasa membaca draf yang belum rapi tanpa menghakimi.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        {mentor.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
            <p className="font-semibold text-slate-900">Belum ada mentor terdaftar</p>
            <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-slate-500">
              Hubungi kami lewat WhatsApp untuk menanyakan jadwal bimbingan.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {mentor.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/mentor-kami/${m.id}`}
                  className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-brand hover:shadow-card-hover"
                >
                  <span className="flex items-start gap-4">
                    {m.foto ? (
                      <Image
                        src={m.foto}
                        alt={`Foto ${m.nama}`}
                        width={64}
                        height={64}
                        className="h-16 w-16 flex-shrink-0 rounded-full object-cover ring-2 ring-brand-100"
                      />
                    ) : (
                      <span className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-brand-50 text-xl font-extrabold text-brand ring-2 ring-brand-100">
                        {m.inisial}
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block font-bold leading-tight text-slate-900">
                        {m.nama}
                      </span>
                      {m.gelar && (
                        <span className="block text-xs font-medium text-slate-500">{m.gelar}</span>
                      )}
                      {m.headline && (
                        <span className="mt-1 block text-xs text-brand">{m.headline}</span>
                      )}
                      {m.kampus && (
                        <span className="mt-1 block text-xs text-slate-500">{m.kampus}</span>
                      )}
                    </span>
                  </span>

                  {m.bidang.length > 0 && (
                    <span className="mt-4 flex flex-wrap gap-1.5">
                      {m.bidang.map((b) => (
                        <span key={b} className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand">
                          {b}
                        </span>
                      ))}
                    </span>
                  )}

                  {(m.rating > 0 || m.sesi > 0) && (
                    <span className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-3 text-sm">
                      {m.rating > 0 && (
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <Star className="h-4 w-4 fill-brand text-brand" aria-hidden="true" />
                          {m.rating.toFixed(1)}
                        </span>
                      )}
                      {m.sesi > 0 && (
                        <span className="flex items-center gap-1 font-medium text-slate-500">
                          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                          {m.sesi} sesi
                        </span>
                      )}
                    </span>
                  )}

                  <span className="mt-auto flex items-center gap-1.5 pt-4 text-sm font-bold text-brand">
                    Lihat profil lengkap
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>

                  {!m.tersedia && (
                    <span className="mt-2 text-xs font-medium text-slate-400">
                      Sedang tidak menerima booking
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
