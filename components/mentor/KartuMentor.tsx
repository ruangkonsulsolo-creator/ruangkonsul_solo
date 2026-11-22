import Image from "next/image";
import Link from "next/link";
import { ArrowRight, GraduationCap, Star, UserRound } from "lucide-react";

export type DataKartuMentor = {
  id: string;
  nama: string;
  gelar: string;
  headline: string;
  kampus: string;
  pendidikanTerakhir: string;
  bidang: string[];
  foto: string | null;
  rating: number;
  sesi: number;
  pengalamanTahun: number;
  tersedia: boolean;
  inisial: string;
};

/**
 * Kartu mentor bergaya potret: foto besar di atas, lalu nama & gelar,
 * jabatan/headline, pendidikan, bidang keahlian, dan pengalaman.
 * Mentor yang belum mengunggah foto tetap tampil dengan ilustrasi inisial,
 * supaya grid tidak bolong — panel mentor mewajibkan unggah foto.
 */
export function KartuMentor({ m, aksi = "booking" }: { m: DataKartuMentor; aksi?: "booking" | "profil" }) {
  const namaLengkap = m.gelar ? `${m.nama}, ${m.gelar}` : m.nama;
  const pendidikan = m.pendidikanTerakhir || m.kampus;
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200 bg-white shadow-card transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card-hover">
      <Link href={`/mentor-kami/${m.id}`} className="relative block aspect-[4/5] overflow-hidden bg-gradient-to-b from-brand-50 to-white" tabIndex={-1} aria-hidden="true">
        {m.foto ? (
          <Image
            src={m.foto}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
            // Foto lama bisa berasal dari host yang tidak terdaftar di next.config.
            unoptimized={!/^\/|\.supabase\.co\/storage\/|lh3\.googleusercontent\.com/.test(m.foto)}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-end">
            <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-white text-base font-extrabold text-brand shadow-md ring-4 ring-brand-100 sm:mb-4 sm:h-20 sm:w-20 sm:text-2xl">
              {m.inisial}
            </span>
            <UserRound className="h-24 w-24 text-brand-200 sm:h-40 sm:w-40" strokeWidth={1} />
          </div>
        )}
        {m.rating > 0 && (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-bold sm:right-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-xs text-slate-800 shadow">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
            {m.rating.toFixed(1)}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-3 sm:p-5">
        <h3 className="text-sm font-extrabold leading-snug text-slate-900 sm:text-lg">
          <Link href={`/mentor-kami/${m.id}`} className="hover:text-brand">{namaLengkap}</Link>
        </h3>
        {m.headline && <p className="mt-1 line-clamp-2 text-xs font-semibold text-brand sm:text-sm">{m.headline}</p>}
        {pendidikan && (
          <span className="mt-2 inline-flex w-fit max-w-full items-center gap-1.5 truncate rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 sm:mt-3 sm:px-3 sm:py-1 sm:text-xs">
            <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
            {pendidikan}
          </span>
        )}
        {m.bidang.length > 0 && (
          <p className="mt-2 hidden line-clamp-3 text-sm leading-relaxed text-slate-600 sm:mt-3 sm:block">{m.bidang.join(", ")}</p>
        )}

        <div className="mt-auto pt-3 sm:pt-4">
          {(m.pengalamanTahun > 0 || m.sesi > 0) && (
            <p className="border-t border-slate-100 pt-2 text-xs font-bold text-slate-800 sm:pt-3 sm:text-sm">
              {m.pengalamanTahun > 0
                ? `${m.pengalamanTahun}+ tahun pengalaman membimbing`
                : `${m.sesi} sesi bimbingan selesai`}
            </p>
          )}
          {aksi === "booking" ? (
            m.tersedia ? (
              <Link
                href={`/booking?mentor=${m.id}`}
                className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-xl bg-brand py-2 text-xs font-bold text-white sm:mt-3 sm:gap-1.5 sm:py-2.5 sm:text-sm transition-colors hover:bg-brand-light"
              >
                Pesan jadwal <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : (
              <span className="mt-2 inline-flex w-full items-center justify-center rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-400 sm:mt-3 sm:py-2.5 sm:text-sm">
                Sedang tidak menerima booking
              </span>
            )
          ) : (
            <Link href={`/mentor-kami/${m.id}`} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline sm:mt-3 sm:gap-1.5 sm:text-sm">
              Lihat profil lengkap <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
