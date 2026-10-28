import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OrderForm } from "@/components/dashboard/OrderForm";
import { ServicePageShell } from "@/components/dashboard/ServicePageShell";
import { Bot } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { PREVIEW_MODE, PREVIEW_USER } from "@/lib/utils/preview-mode";
import type { Metadata } from "next";
export const metadata: Metadata = { title: `AI Detector | ${BRAND.name}` };

export default async function CekAIPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { if (!PREVIEW_MODE) redirect("/login"); }
  const { data: service } = await supabase.from("services").select("id, price_idr, sla_hours").eq("slug", "ai-detector").single();
  const { data: quota } = await supabase.from("user_quotas").select("id, quota_remaining, expires_at").eq("user_id", user?.id ?? PREVIEW_USER.id).eq("service_id", service?.id ?? "").eq("is_expired", false).gt("quota_remaining", 0).order("expires_at", { ascending: true }).limit(1).maybeSingle();
  return (
    <ServicePageShell icon={Bot} name="AI Detector" description="Identifikasi proporsi teks yang ditulis oleh AI dalam dokumenmu dengan skor per paragraf." slaHours={service?.sla_hours ?? 12} formats="PDF, DOCX, DOC" maxSizeMb={50} colorClass="bg-brand-50 text-brand">
      <OrderForm serviceSlug="ai-detector" serviceName="AI Detector" servicePrice={service?.price_idr ?? 25000} activeQuota={quota ?? null} maxFileSizeMb={50} />
    </ServicePageShell>
  );
}
