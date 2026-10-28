import { createClient } from "@/lib/supabase/server";
import { PaketConfigForm } from "@/components/admin/PaketConfigForm";
import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";
export const metadata: Metadata = { title: `Konfigurasi Paket Hemat | Admin ${BRAND.name}` };

export default async function AdminPaketPage() {
  const supabase = createClient();
  const [{ data: packages }, { data: services }] = await Promise.all([
    supabase.from("quota_packages").select("id, name, service_id, quota_amount, price_idr, validity_days, is_active, is_popular").order("created_at", { ascending: true }),
    supabase.from("services").select("id, name, slug").eq("is_active", true),
  ]);
  return (
    <div className="space-y-6 max-w-4xl">
      <div><h2 className="text-xl font-extrabold text-slate-900">Konfigurasi Paket Hemat</h2><p className="text-sm text-muted-foreground mt-1">Kelola paket kuota yang ditawarkan kepada pengguna.</p></div>
      <PaketConfigForm packages={packages ?? []} services={services ?? []} />
    </div>
  );
}
