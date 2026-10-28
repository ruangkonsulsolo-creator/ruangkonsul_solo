import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BRAND } from "@/lib/brand";
import { BookOpen, FileText, Video, Download, Upload, ArrowRight, Plus } from "lucide-react";
import type { Metadata } from "next";
export const metadata: Metadata = { title: `Materi & Modul | ${BRAND.name}` };

const MODULES = [
  { id: "mod1", title: "Template Skripsi S1 — BAB 1-3", type: "document", size: "2.4 MB", downloads: 34, category: "Skripsi S1" },
  { id: "mod2", title: "Panduan Metodologi Penelitian", type: "document", size: "1.8 MB", downloads: 52, category: "Metodologi" },
  { id: "mod3", title: "Video: Cara Membuat Statistik Deskriptif", type: "video", size: "45 min", downloads: 28, category: "Data Analysis" },
  { id: "mod4", title: "Template Tesis S2 — Format Standar", type: "document", size: "3.1 MB", downloads: 19, category: "Tesis S2" },
  { id: "mod5", title: "Checklist Sidang Skripsi", type: "document", size: "0.5 MB", downloads: 67, category: "Sidang" },
];

const TYPE_ICONS: Record<string, React.ElementType> = {
  document: FileText,
  video: Video,
};

export default async function MateriPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Materi & Modul</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Bagikan materi bimbingan ke klien-mu.</p>
        </div>
        <Button className="gap-2">
          <Upload className="h-3.5 w-3.5" />
          Upload Materi
        </Button>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {["Semua", "Skripsi S1", "Tesis S2", "Metodologi", "Data Analysis", "Sidang"].map((cat, i) => (
          <button
            key={cat}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              i === 0
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Modules list */}
      <div className="space-y-3">
        {MODULES.map((m) => {
          const Icon = TYPE_ICONS[m.type] ?? FileText;
          return (
            <Card key={m.id} className="flex items-center gap-4 p-4 group hover:border-brand-200 transition-colors">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 flex-shrink-0">
                <Icon className="h-5 w-5 text-[#8B0000]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{m.title}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Download className="h-3 w-3" />
                    {m.downloads}x diunduh
                  </span>
                  <span>·</span>
                  <span>{m.size}</span>
                </div>
              </div>
              <Badge variant="info" className="flex-shrink-0">{m.category}</Badge>
              <Button size="sm" variant="outline" className="gap-1.5 flex-shrink-0">
                <Download className="h-3.5 w-3.5" />
                Bagikan
              </Button>
            </Card>
          );
        })}
      </div>

      {/* Empty hint */}
      <div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-center">
        <BookOpen className="h-5 w-5 text-slate-300 flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          Upload materi bimbingan (PDF, DOCX, video) untuk dibagikan ke klien. Klien dapat mengunduh
          materi yang kamu bagikan dari dashboard mereka.
        </p>
      </div>
    </div>
  );
}
