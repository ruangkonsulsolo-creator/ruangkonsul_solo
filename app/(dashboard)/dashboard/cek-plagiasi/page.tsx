import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OrderForm } from "@/components/dashboard/OrderForm";
import { ServicePageShell } from "@/components/dashboard/ServicePageShell";
import { DetectionResultCard } from "@/components/dashboard/DetectionResultCard";
import { FileSearch, RefreshCw, AlertTriangle } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { PREVIEW_MODE, PREVIEW_USER } from "@/lib/utils/preview-mode";
import type { DetectionResult } from "@/types/detection";
import type { Metadata } from "next";
export const metadata: Metadata = { title: `Cek Plagiasi | ${BRAND.name}` };

const PROCESSING_STATUSES = new Set(["diproses", "dibayar"]);

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
  const focusOrderId = searchParams.order ?? null;
  let focusedOrder: any = null;
  if (focusOrderId) {
    const { data } = await supabase.from("orders").select("id, order_number, status, result, detection_error, completed_at, detection_started_at").eq("id", focusOrderId).eq("user_id", user?.id ?? PREVIEW_USER.id).single();
    if (data) focusedOrder = { ...data, result: (data.result as unknown as DetectionResult) ?? null };
  }
  if (!focusedOrder) {
    const { data } = await supabase.from("orders").select("id, order_number, status, result, detection_error, completed_at, detection_started_at").eq("user_id", user?.id ?? PREVIEW_USER.id).eq("service_id", service?.id ?? "").in("status", ["diproses","dibayar","selesai","processing_failed"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (data) focusedOrder = { ...data, result: (data.result as unknown as DetectionResult) ?? null };
  }
  const isProcessing = focusedOrder ? PROCESSING_STATUSES.has(focusedOrder.status) : false;
  const isFailed = focusedOrder?.status === "processing_failed";
  const isDone = focusedOrder?.status === "selesai";

  return (
    <ServicePageShell icon={FileSearch} name="Cek Plagiasi" description="Deteksi kemiripan teks dokumenmu dengan laporan persentase lengkap dan highlight sumber." slaHours={service?.sla_hours ?? 24} formats="PDF, DOCX, DOC" maxSizeMb={50} colorClass="bg-brand-50 text-brand">
      <div className="space-y-8">
        {isDone && focusedOrder?.result && (
          <section aria-label="Hasil analisis plagiasi">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-700">Hasil Analisis — <span className="font-mono text-xs text-muted-foreground">{focusedOrder.order_number}</span></h3>
            </div>
            <DetectionResultCard result={focusedOrder.result} orderNumber={focusedOrder.order_number} />
            <div className="mt-5 pt-5 border-t border-slate-100">
              <a href="/cek-plagiasi" className="text-sm font-semibold text-brand hover:underline">+ Analisis dokumen baru</a>
            </div>
          </section>
        )}
        {isProcessing && focusedOrder && (
          <section aria-live="polite" className="rounded-2xl border border-brand-200 bg-brand-50 p-5">
            <div className="flex items-start gap-3">
              <RefreshCw className="h-5 w-5 text-brand flex-shrink-0 mt-0.5 animate-spin" />
              <div>
                <p className="text-sm font-semibold text-brand-dark">Sedang dianalisis…</p>
                <p className="text-xs text-brand mt-0.5">Pesanan <span className="font-mono font-bold">{focusedOrder.order_number}</span> sedang diproses.</p>
              </div>
            </div>
            <meta httpEquiv="refresh" content="5" />
          </section>
        )}
        {isFailed && focusedOrder && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Analisis tertunda</p>
                <p className="text-xs text-amber-700 mt-0.5">Terjadi kendala teknis. Tim kami akan memproses ulang secara manual.</p>
              </div>
            </div>
          </section>
        )}
        {(!focusedOrder || isDone || isFailed) && (
          <section>
            {(isDone || isFailed) && <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Upload Dokumen Baru</p>}
            <OrderForm serviceSlug="plagiasi" serviceName="Cek Plagiasi" servicePrice={service?.price_idr ?? 35000} activeQuota={quota ?? null} maxFileSizeMb={50} />
          </section>
        )}
      </div>
    </ServicePageShell>
  );
}
