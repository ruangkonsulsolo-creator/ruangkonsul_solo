import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OrderForm } from "@/components/dashboard/OrderForm";
import { ServicePageShell } from "@/components/dashboard/ServicePageShell";
import { ServiceOrderPanel } from "@/components/dashboard/ServiceOrderPanel";
import { getLatestServiceOrder } from "@/lib/orders/latest";
import { FileSearch } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { PREVIEW_MODE, PREVIEW_USER } from "@/lib/utils/preview-mode";
import type { Metadata } from "next";
export const metadata: Metadata = { title: `Cek Plagiasi | ${BRAND.name}` };

export default async function CekPlagiasiPage({ searchParams }: { searchParams: { order?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { if (!PREVIEW_MODE) redirect("/login"); }
  const [serviceRes, quotaRes] = await Promise.all([
    supabase.from("services").select("id, price_idr, sla_hours").eq("slug", "plagiasi").single(),
    supabase.from("user_quotas").select("id, quota_remaining, expires_at").eq("user_id", user?.id ?? PREVIEW_USER.id).eq("is_expired", false).gt("quota_remaining", 0).order("expires_at", { ascending: true }).limit(1).maybeSingle(),
  ]);
  const service = serviceRes.data;
  const quota = quotaRes.data;
  const latest = await getLatestServiceOrder(supabase, user?.id ?? PREVIEW_USER.id, service?.id, searchParams.order);
  const showForm = !latest || latest.status === "selesai" || latest.status === "processing_failed";

  return (
    <ServicePageShell icon={FileSearch} name="Cek Plagiasi" description="Deteksi kemiripan teks dokumenmu dengan laporan persentase lengkap dan highlight sumber." slaHours={service?.sla_hours ?? 24} formats="PDF, DOCX" maxSizeMb={50} colorClass="bg-brand-50 text-brand">
      <div className="space-y-8">
        <ServiceOrderPanel order={latest} kind="similarity" />
        {showForm && (
          <section>
            {latest && <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Upload Dokumen Baru</p>}
            <OrderForm serviceSlug="plagiasi" serviceName="Cek Plagiasi" servicePrice={service?.price_idr ?? 35000} activeQuota={quota ?? null} maxFileSizeMb={50} />
          </section>
        )}
      </div>
    </ServicePageShell>
  );
}
