import { createClient } from "@/lib/supabase/server";
import { KodeMentorPanel, type KodeMentor } from "@/components/admin/KodeMentorPanel";
import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Kode Mentor | Admin ${BRAND.name}` };

/** Kode undangan sekali pakai untuk pendaftaran mentor (migration 039). */
export default async function AdminKodeMentorPage() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("kode_mentor")
    .select(
      "id, kode, untuk_nama, created_at, kedaluwarsa_at, aktif, dipakai_at, " +
        "pemakai:profiles!kode_mentor_dipakai_oleh_fkey(full_name)"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Kode Mentor</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Buat kode sekali pakai lalu kirim ke calon mentor. Mereka masuk dengan Google di tab
          &ldquo;Mentor&rdquo;, mengisi data diri dan kode ini, lalu akunnya otomatis menjadi mentor.
          Atur tarif & profil mentor setelahnya di menu Kinerja Mentor.
        </p>
      </div>
      {error && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Tabel kode mentor belum ada. Jalankan migration 039 di Supabase SQL Editor.
        </p>
      )}
      <KodeMentorPanel awal={(data ?? []) as unknown as KodeMentor[]} />
    </div>
  );
}
