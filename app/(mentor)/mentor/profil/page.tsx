import type { Metadata } from "next";
import { FormProfilMentor } from "@/components/mentor/FormProfilMentor";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: `Profil Mentor | ${BRAND.name}` };
export const dynamic = "force-dynamic";

export default function ProfilMentorPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Profil Mentor</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Yang kamu tulis di sini tampil di halaman mentor dan dilihat calon
          klien sebelum memesan sesi.
        </p>
      </div>
      <FormProfilMentor />
    </div>
  );
}
