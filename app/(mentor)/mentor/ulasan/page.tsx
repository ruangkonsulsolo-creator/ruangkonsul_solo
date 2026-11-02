import type { Metadata } from "next";
import { PanelUlasan } from "@/components/mentor/PanelUlasan";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: `Ulasan | ${BRAND.name}` };
export const dynamic = "force-dynamic";

export default function UlasanMentorPage() {
  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Ulasan</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Penilaian dari klien yang sudah menyelesaikan sesi bimbingan
          bersamamu.
        </p>
      </div>
      <PanelUlasan />
    </div>
  );
}
