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
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card-hover">
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
            <span className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white text-2xl font-extrabold text-brand shadow-md ring-4 ring-brand-100">
              {m.inisial}
            </span>
            <UserRound className="h-40 w-40 text-brand-200" strokeWidth={1} />
          </div>
        )}
        {m.rating > 0 && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-slate-800 shadow">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
            {m.rating.toFixed(1)}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-extrabold leading-snug text-slate-900">
          <Link href={`/mentor-kami/${m.id}`} className="hover:text-brand">{namaLengkap}</Link>
        </h3>
        {m.headline && <p className="mt-1 text-sm font-semibold text-brand">{m.headline}</p>}
        {pendidikan && (
          <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
            {pendidikan}
          </span>
        )}
        {m.bidang.length > 0 && (
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">{m.bidang.join(", ")}</p>
        )}

        <div className="mt-auto pt-4">
          {(m.pengalamanTahun > 0 || m.sesi > 0) && (
            <p className="border-t border-slate-100 pt-3 text-sm font-bold text-slate-800">
              {m.pengalamanTahun > 0
                ? `${m.pengalamanTahun}+ tahun pengalaman membimbing`
                : `${m.sesi} sesi bimbingan selesai`}
            </p>
          )}
          {aksi === "booking" ? (
            m.tersedia ? (
              <Link
                href={`/booking?mentor=${m.id}`}
                className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-light"
              >
                Pesan jadwal <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : (
              <span className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-400">
                Sedang tidak menerima booking
              </span>
            )
          ) : (
            <Link href={`/mentor-kami/${m.id}`} className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-brand hover:underline">
              Lihat profil lengkap <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
