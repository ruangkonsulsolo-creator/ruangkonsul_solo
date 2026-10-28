import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OrderForm } from "@/components/dashboard/OrderForm";
import { ServicePageShell } from "@/components/dashboard/ServicePageShell";
import { PenLine, Info } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { PREVIEW_MODE, PREVIEW_USER } from "@/lib/utils/preview-mode";
import type { Metadata } from "next";
export const metadata: Metadata = { title: `Jasa Parafrase | ${BRAND.name}` };

export default async function JasaParafrasePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { if (!PREVIEW_MODE) redirect("/login"); }
  const { data: service } = await supabase.from("services").select("id, price_idr, sla_hours").eq("slug", "parafrase").single();
  const { data: quota } = await supabase.from("user_quotas").select("id, quota_remaining, expires_at").eq("user_id", user?.id ?? PREVIEW_USER.id).eq("service_id", service?.id ?? "").eq("is_expired", false).gt("quota_remaining", 0).order("expires_at", { ascending: true }).limit(1).maybeSingle();
  return (
    <ServicePageShell icon={PenLine} name="Jasa Parafrase" description={`Penulisan ulang dokumen secara profesional oleh tim ${BRAND.name}. Dapat menurunkan plagiasi hingga 80%.`} slaHours={service?.sla_hours ?? 72} formats="PDF, DOCX, DOC" maxSizeMb={50} colorClass="bg-brand-50 text-brand"
      notice={<div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm"><Info className="h-4 w-4 flex-shrink-0 text-amber-600 mt-0.5" /><p className="text-amber-800 leading-relaxed">Harga dihitung <strong>per halaman</strong>. Admin akan konfirmasi total harga setelah dokumen diterima. Mulai dari <strong>Rp 75.000/halaman</strong>.</p></div>}>
      <OrderForm serviceSlug="parafrase" serviceName="Jasa Parafrase" servicePrice={service?.price_idr ?? 75000} activeQuota={quota ?? null} maxFileSizeMb={50} />
    </ServicePageShell>
  );
}
