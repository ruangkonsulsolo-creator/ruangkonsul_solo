import { AlertTriangle, Download, FileText, RefreshCw } from "lucide-react";
import { DetectionResultCard } from "./DetectionResultCard";
import { AiResultCard } from "./AiResultCard";
import { ProcessingWatcher } from "./ProcessingWatcher";
import type { DetectionResult } from "@/types/detection";
import type { AiDetectionResult, ParaphraseResult } from "@/types/processing";

export interface PanelOrder {
  id: string;
  order_number: string;
  status: string;
  result: unknown;
  detection_error: string | null;
  detection_started_at: string | null;
  report_storage_path: string | null;
  output_storage_path?: string | null;
}

/**
 * Status & hasil pesanan terakhir untuk satu layanan:
 * sedang diproses → watcher; selesai → hasil + tombol unduh laporan; gagal → info.
 */
export function ServiceOrderPanel({ order, kind }: { order: PanelOrder | null; kind: "similarity" | "ai" | "paraphrase" | "manual" }) {
  if (!order) return null;
  const processing = order.status === "diproses";
  const failed = order.status === "processing_failed";
  const done = order.status === "selesai";

  if (processing) {
    return (
      <section aria-live="polite" className="rounded-2xl border border-brand-200 bg-brand-50 p-5">
        <div className="flex items-start gap-3">
          <RefreshCw className="mt-0.5 h-5 w-5 flex-shrink-0 animate-spin text-brand" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-brand-dark">{kind === "manual" ? "Sedang diproses tim kami…" : "Sedang dianalisis otomatis…"}</p>
            <p className="mt-0.5 text-xs text-brand">
              Pesanan <span className="font-mono font-bold">{order.order_number}</span>.{" "}
              {kind === "paraphrase" ? "Parafrase dokumen panjang bisa memakan beberapa menit." : kind === "manual" ? "Laporan resmi akan diunggah admin." : "Biasanya selesai dalam 1–3 menit."}
            </p>
          </div>
        </div>
        {kind !== "manual" && <ProcessingWatcher orderId={order.id} startedAt={order.detection_started_at} />}
      </section>
    );
  }

  if (failed) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Analisis tertunda — {order.order_number}</p>
            <p className="mt-0.5 text-xs text-amber-700">
              {order.detection_error?.includes("Format") || order.detection_error?.includes("scan")
                ? order.detection_error
                : "Terjadi kendala teknis. Sistem akan mencoba ulang otomatis, atau tim kami memproses manual."}
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (!done) return null;

  return (
    <section className="space-y-4" aria-label="Hasil pesanan">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-700">
          Hasil — <span className="font-mono text-xs text-muted-foreground">{order.order_number}</span>
        </h3>
        <div className="flex flex-wrap gap-2">
          {order.report_storage_path && (
            <a href={`/api/report/${order.id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-[#8B0000] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">
              <Download className="h-3.5 w-3.5" aria-hidden="true" /> Unduh Laporan PDF
            </a>
          )}
          {order.output_storage_path && (
            <a href={`/api/order/${order.id}/output`} className="inline-flex items-center gap-1.5 rounded-lg border border-[#8B0000] px-3 py-1.5 text-xs font-semibold text-[#8B0000] hover:bg-brand-50">
              <FileText className="h-3.5 w-3.5" aria-hidden="true" /> Unduh Hasil Parafrase (.docx)
            </a>
          )}
        </div>
      </div>

      {kind === "similarity" && isDetection(order.result) && <DetectionResultCard result={order.result} orderNumber={order.order_number} />}
      {kind === "ai" && isAi(order.result) && <AiResultCard result={order.result} />}
      {kind === "paraphrase" && isParaphrase(order.result) && <ParaphrasePreview result={order.result} />}
    </section>
  );
}

function ParaphrasePreview({ result }: { result: ParaphraseResult }) {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        <p className="text-2xl font-extrabold">{result.avg_change_pct}%</p>
        <p>rata-rata frasa berubah · {result.paragraph_count} paragraf{result.truncated ? " · sebagian melebihi batas kata" : ""}</p>
      </div>
      {result.paragraphs.filter((p) => p.change_pct > 0).slice(0, 3).map((p, i) => (
        <div key={i} className="grid gap-3 rounded-xl border bg-white p-4 text-sm md:grid-cols-2">
          <div><p className="mb-1 text-[11px] font-bold uppercase text-muted-foreground">Asli</p><p className="text-slate-500">{p.original}</p></div>
          <div><p className="mb-1 text-[11px] font-bold uppercase text-[#8B0000]">Parafrase · {p.change_pct}%</p><p className="text-slate-800">{p.paraphrased}</p></div>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">Pratinjau 3 paragraf pertama. Dokumen lengkap ada di file .docx.</p>
    </div>
  );
}

function isDetection(r: unknown): r is DetectionResult {
  return !!r && typeof r === "object" && "overall_similarity" in r;
}
function isAi(r: unknown): r is AiDetectionResult {
  return !!r && typeof r === "object" && (r as { kind?: string }).kind === "ai";
}
function isParaphrase(r: unknown): r is ParaphraseResult {
  return !!r && typeof r === "object" && (r as { kind?: string }).kind === "paraphrase";
}
