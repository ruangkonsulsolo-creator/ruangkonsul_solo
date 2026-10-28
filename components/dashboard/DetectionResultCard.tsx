"use client";

import { useState } from "react";
import {
  AlertTriangle, CheckCircle2, ChevronDown, ChevronUp,
  ExternalLink, FileSearch, Info,
} from "lucide-react";
import type { DetectionResult, TextSegment } from "@/types/detection";
import { cn } from "@/lib/utils";

interface DetectionResultCardProps {
  result: DetectionResult;
  orderNumber: string;
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function similarityColor(pct: number): string {
  if (pct < 20) return "text-brand bg-brand-50 border-brand-200";
  if (pct < 40) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-red-700 bg-red-50 border-red-200";
}

function similarityBarColor(pct: number): string {
  if (pct < 20) return "bg-brand";
  if (pct < 40) return "bg-amber-500";
  return "bg-red-500";
}

function similarityLabel(pct: number): string {
  if (pct < 20) return "Rendah — Aman";
  if (pct < 40) return "Sedang — Perlu Revisi";
  return "Tinggi — Butuh Perhatian";
}

function pctDisplay(n: number): string {
  return `${n.toFixed(1)}%`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SegmentRow({ seg, index }: { seg: TextSegment; index: number }) {
  const [open, setOpen] = useState(false);
  const isPlagiarized = seg.is_plagiarized;

  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden transition-colors",
        isPlagiarized
          ? "border-red-200 bg-red-50/40"
          : "border-slate-100 bg-white"
      )}
    >
      {/* Header row */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50/50 transition-colors"
        aria-expanded={open}
      >
        <span className="mt-0.5 flex-shrink-0">
          {isPlagiarized
            ? <AlertTriangle className="h-4 w-4 text-red-500" aria-hidden="true" />
            : <CheckCircle2 className="h-4 w-4 text-brand" aria-hidden="true" />
          }
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-600 mb-0.5">
            Segmen {index + 1}
            {isPlagiarized && (
              <span className="ml-2 rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-[10px] font-bold">
                {pctDisplay(seg.similarity_score)} mirip
              </span>
            )}
          </p>
          <p className="text-sm text-slate-700 line-clamp-2 leading-relaxed">
            {seg.text}
          </p>
        </div>

        <span className="flex-shrink-0 text-slate-400 mt-0.5">
          {open
            ? <ChevronUp className="h-4 w-4" aria-hidden="true" />
            : <ChevronDown className="h-4 w-4" aria-hidden="true" />
          }
        </span>
      </button>

      {/* Detail matches */}
      {open && seg.matches.length > 0 && (
        <div className="border-t border-slate-100 px-4 py-3 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Sumber Yang Mirip
          </p>
          {seg.matches.slice(0, 3).map((m) => (
            <div
              key={m.chunk_id}
              className="rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="font-semibold text-slate-800 line-clamp-1 flex-1">
                  {m.title}
                </span>
                <span className="flex-shrink-0 font-bold text-red-600">
                  {pctDisplay(m.similarity * 100)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium capitalize">
                  {m.source_name}
                </span>
                {m.source_url && (
                  <a
                    href={m.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-0.5 text-brand hover:underline"
                  >
                    Lihat sumber
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                )}
              </div>
              <p className="mt-1.5 text-slate-500 line-clamp-2 italic">
                "{m.chunk_text}"
              </p>
            </div>
          ))}
          {seg.matches.length > 3 && (
            <p className="text-xs text-muted-foreground pl-1">
              +{seg.matches.length - 3} sumber lainnya
            </p>
          )}
        </div>
      )}

      {open && seg.matches.length === 0 && (
        <div className="border-t border-slate-100 px-4 py-3 text-xs text-muted-foreground">
          Tidak ada sumber yang terdeteksi mirip.
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DetectionResultCard({
  result,
  orderNumber,
}: DetectionResultCardProps) {
  const [showAllSegments, setShowAllSegments] = useState(false);
  const [showMeta, setShowMeta] = useState(false);

  const sim = result.overall_similarity;
  const plagiarizedSegments = result.segments.filter((s) => s.is_plagiarized);
  const visibleSegments = showAllSegments
    ? result.segments
    : result.segments.slice(0, 5);

  return (
    <div className="space-y-5">

      {/* ── Score card utama ── */}
      <div className={cn(
        "rounded-2xl border p-5",
        similarityColor(sim)
      )}>
        <div className="flex items-start gap-5">
          {/* Angka similarity besar */}
          <div className="flex flex-col items-center flex-shrink-0 min-w-[72px]">
            <span className="text-5xl font-extrabold leading-none">
              {pctDisplay(sim)}
            </span>
            <span className="text-xs font-semibold mt-1 opacity-80">
              Similarity
            </span>
          </div>

          {/* Info samping */}
          <div className="flex-1 min-w-0 space-y-2">
            <p className="text-base font-extrabold">
              {similarityLabel(sim)}
            </p>

            {/* Progress bar */}
            <div className="h-2.5 w-full rounded-full bg-black/10 overflow-hidden">
              <div
                className={cn("h-2.5 rounded-full transition-all", similarityBarColor(sim))}
                style={{ width: `${Math.min(sim, 100)}%` }}
                role="progressbar"
                aria-valuenow={sim}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>

            {/* Stats strip */}
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs font-medium opacity-80">
              <span>{result.word_count.toLocaleString("id-ID")} kata</span>
              <span>{result.segment_count} segmen dianalisis</span>
              <span>{plagiarizedSegments.length} segmen terdeteksi mirip</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Top sources ── */}
      {result.top_sources.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-card">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
            <FileSearch className="h-4 w-4 text-brand" aria-hidden="true" />
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Sumber Teratas
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {result.top_sources.map((src, i) => (
              <div
                key={`${src.source_name}-${i}`}
                className="flex items-center gap-3 px-4 py-3"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-50 text-brand text-[11px] font-extrabold flex-shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {src.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium capitalize text-slate-500">
                      {src.source_name}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {src.match_count} segmen · maks {pctDisplay(src.max_similarity * 100)}
                    </span>
                  </div>
                </div>
                {src.source_url && (
                  <a
                    href={src.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 text-brand hover:text-brand-light"
                    aria-label={`Buka sumber: ${src.title}`}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Segment detail ── */}
      {result.segments.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Detail Per Segmen ({result.segment_count} total)
          </p>
          <div className="space-y-2">
            {visibleSegments.map((seg, i) => (
              <SegmentRow key={i} seg={seg} index={i} />
            ))}
          </div>

          {result.segments.length > 5 && (
            <button
              onClick={() => setShowAllSegments((s) => !s)}
              className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-brand-light transition-colors"
            >
              {showAllSegments ? (
                <><ChevronUp className="h-4 w-4" /> Sembunyikan segmen</>
              ) : (
                <><ChevronDown className="h-4 w-4" /> Tampilkan semua {result.segments.length} segmen</>
              )}
            </button>
          )}
        </div>
      )}

      {/* ── Metadata teknis (collapsible) ── */}
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <button
          onClick={() => setShowMeta((m) => !m)}
          className="flex w-full items-center justify-between px-4 py-3 text-xs font-semibold text-muted-foreground hover:bg-slate-50 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5" aria-hidden="true" />
            Metadata Teknis
          </span>
          {showMeta
            ? <ChevronUp className="h-3.5 w-3.5" />
            : <ChevronDown className="h-3.5 w-3.5" />
          }
        </button>
        {showMeta && (
          <div className="border-t border-slate-100 px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-slate-500">
            {[
              ["Model", result.metadata.embedding_model],
              ["Threshold", pctDisplay(result.metadata.similarity_threshold * 100)],
              ["Chunking", result.metadata.chunking_strategy],
              ["Waktu proses", `${result.metadata.processing_time_ms} ms`],
              ["Versi engine", result.metadata.engine_version],
              ["No. Pesanan", orderNumber],
            ].map(([label, val]) => (
              <div key={label} className="flex gap-1.5">
                <span className="font-medium text-slate-600">{label}:</span>
                <span className="font-mono">{val}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
