"use client";

import { useState } from "react";
import { Bot, ChevronDown, ChevronUp, Info } from "lucide-react";
import type { AiDetectionResult } from "@/types/processing";
import { cn } from "@/lib/utils";

const color = (p: number) => (p >= 65 ? "text-red-700 bg-red-50 border-red-200" : p >= 35 ? "text-amber-700 bg-amber-50 border-amber-200" : "text-green-700 bg-green-50 border-green-200");
const bar = (p: number) => (p >= 65 ? "bg-red-500" : p >= 35 ? "bg-amber-500" : "bg-green-500");

export function AiResultCard({ result }: { result: AiDetectionResult }) {
  const [open, setOpen] = useState<number | null>(null);
  const top = [...result.segments].sort((a, b) => b.ai_score - a.ai_score);
  return (
    <div className="space-y-4">
      <div className={cn("flex items-center gap-4 rounded-2xl border p-5", color(result.overall_ai_score))}>
        <Bot className="h-8 w-8" aria-hidden="true" />
        <div>
          <p className="text-3xl font-extrabold">{result.overall_ai_score}%</p>
          <p className="text-sm font-semibold">Indikasi teks AI: {result.verdict}</p>
          <p className="text-xs opacity-80">{result.analyzed_segments} segmen dianalisis · {result.word_count.toLocaleString("id-ID")} kata</p>
        </div>
      </div>
      <div className="space-y-2">
        {top.map((s) => (
          <div key={s.index} className="rounded-xl border border-slate-200 bg-white">
            <button className="flex w-full items-center gap-3 px-4 py-3 text-left" onClick={() => setOpen(open === s.index ? null : s.index)}>
              <span className="w-12 text-sm font-bold">{s.ai_score}%</span>
              <span className="h-1.5 flex-1 rounded bg-slate-100"><span className={cn("block h-1.5 rounded", bar(s.ai_score))} style={{ width: `${s.ai_score}%` }} /></span>
              <span className="w-2/5 truncate text-xs text-slate-500">{s.text.slice(0, 80)}</span>
              {open === s.index ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {open === s.index && (
              <div className="space-y-2 border-t px-4 py-3 text-sm text-slate-700">
                <p className="whitespace-pre-line">{s.text}</p>
                {s.signals.length > 0 && <p className="text-xs text-slate-500">Sinyal: {s.signals.join(" · ")}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="flex gap-2 text-xs text-muted-foreground"><Info className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" /> Skor AI adalah estimasi probabilistik, bukan bukti. Gunakan untuk bahan revisi.</p>
    </div>
  );
}
