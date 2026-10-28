import { createClient } from "@/lib/supabase/server";
import { LayananConfigForm } from "@/components/admin/LayananConfigForm";
import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";
export const metadata: Metadata = { title: `Konfigurasi Layanan | Admin ${BRAND.name}` };

export default async function AdminLayananPage() {
  const supabase = createClient();
  const { data: services } = await supabase.from("services").select("id, slug, name, description, price_idr, sla_hours, max_file_size_mb, is_active").order("created_at", { ascending: true });
  return (
    <div className="space-y-6 max-w-3xl">
      <div><h2 className="text-xl font-extrabold text-slate-900">Konfigurasi Layanan & Harga</h2><p className="text-sm text-muted-foreground mt-1">Ubah harga, SLA, dan status aktif setiap layanan. Perubahan langsung berlaku.</p></div>
      <LayananConfigForm services={services ?? []} />
    </div>
  );
}
