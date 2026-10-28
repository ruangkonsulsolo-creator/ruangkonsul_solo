import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OrderForm } from "@/components/dashboard/OrderForm";
import { ServicePageShell } from "@/components/dashboard/ServicePageShell";
import { BookOpenCheck } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { PREVIEW_MODE, PREVIEW_USER } from "@/lib/utils/preview-mode";
import type { Metadata } from "next";
export const metadata: Metadata = { title: `DrillBit Checker | ${BRAND.name}` };

export default async function CekDrillbitPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { if (!PREVIEW_MODE) redirect("/login"); }
  const { data: service } = await supabase.from("services").select("id, price_idr, sla_hours").eq("slug", "drillbit").single();
  const { data: quota } = await supabase.from("user_quotas").select("id, quota_remaining, expires_at").eq("user_id", user?.id ?? PREVIEW_USER.id).eq("service_id", service?.id ?? "").eq("is_expired", false).gt("quota_remaining", 0).order("expires_at", { ascending: true }).limit(1).maybeSingle();
  return (
    <ServicePageShell icon={BookOpenCheck} name="DrillBit Checker" description="Cek plagiasi menggunakan mesin DrillBit resmi yang digunakan oleh kampus-kampus di Indonesia." slaHours={service?.sla_hours ?? 48} formats="PDF, DOCX" maxSizeMb={20} colorClass="bg-brand-50 text-brand">
      <OrderForm serviceSlug="drillbit" serviceName="DrillBit Checker" servicePrice={service?.price_idr ?? 45000} activeQuota={quota ?? null} maxFileSizeMb={20} />
    </ServicePageShell>
  );
}
