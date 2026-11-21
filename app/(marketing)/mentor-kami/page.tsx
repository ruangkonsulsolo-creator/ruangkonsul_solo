import type { Metadata } from "next";
import { ambilMentorPublik } from "@/lib/mentor/publik";
import { KartuMentor } from "@/components/mentor/KartuMentor";
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
  const mentor = await ambilMentorPublik();

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

      <section className="mx-auto max-w-7xl px-4 py-14">
        {mentor.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
            <p className="font-semibold text-slate-900">Belum ada mentor terdaftar</p>
            <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-slate-500">
              Hubungi kami lewat WhatsApp untuk menanyakan jadwal bimbingan.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {mentor.map((m) => (
              <li key={m.id}>
                <KartuMentor m={m} aksi="profil" />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
