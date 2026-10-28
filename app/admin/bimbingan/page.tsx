import { createClient } from "@/lib/supabase/server";
import { KelasAdminTable } from "@/components/admin/KelasAdminTable";
import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";
export const metadata: Metadata = { title: `Kelola Bimbingan | Admin ${BRAND.name}` };

export default async function AdminBimbinganPage() {
  const supabase = createClient();
  const { data: kelas } = await supabase.from("kelas_bimbingan").select("id, tab, tag, title, subtitle, harga, is_active, sort_order, rating, review_count, image_url").order("sort_order", { ascending: true });
  return (
    <div className="space-y-5 max-w-5xl">
      <div><h2 className="text-xl font-extrabold text-slate-900">Kelola Kelas Bimbingan</h2><p className="text-sm text-muted-foreground mt-0.5">Tambah, edit, dan nonaktifkan kelas bimbingan yang tampil di halaman /bimbingan.</p></div>
      <KelasAdminTable kelas={kelas ?? []} />
    </div>
  );
}
