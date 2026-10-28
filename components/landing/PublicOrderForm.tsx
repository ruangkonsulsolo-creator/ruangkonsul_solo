"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { Upload, X, CheckCircle2, ArrowRight, LogIn, Clock, FileCheck2, ShieldCheck, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BRAND, waLink } from "@/lib/brand";

interface PublicOrderFormProps {
  serviceSlug: string; serviceName: string; servicePrice: number;
  slaHours: number; formats: string; maxSizeMb: number;
  icon: LucideIcon; iconColor: string; iconBg: string;
  description: string; note?: string;
}

function fmt(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

const ALLOWED_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

export function PublicOrderForm({
  serviceSlug, serviceName, servicePrice, slaHours,
  formats, maxSizeMb, icon: Icon, iconColor, iconBg, description, note,
}: PublicOrderFormProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"upload" | "confirm">("upload");

  function validate(file: File) {
    if (!ALLOWED_MIME.includes(file.type)) return "Format tidak didukung. Gunakan PDF, DOCX, atau DOC.";
    if (file.size > maxSizeMb * 1024 * 1024) return `Ukuran file melebihi batas ${maxSizeMb} MB.`;
    return null;
  }

  function handleFile(file: File) {
    const err = validate(file);
    if (err) { setError(err); return; }
    setError(null); setSelectedFile(file); setStep("confirm");
  }

  function formatBytes(b: number) {
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  }

  const dashboardPath = {
    "plagiasi": "/dashboard/cek-plagiasi",
    "ai-detector": "/dashboard/cek-ai",
    "drillbit": "/dashboard/cek-drillbit",
    "parafrase": "/dashboard/jasa-parafrase",
  }[serviceSlug] ?? "/dashboard";

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Image src={BRAND.logoPng} alt={BRAND.name} width={28} height={28} unoptimized className="object-contain" />
            <span className="text-lg font-extrabold text-[#8B0000]">{BRAND.shortName}</span>
          </Link>
          <div className="hidden md:flex items-center gap-5 text-sm font-medium text-slate-600">
            <Link href="/cek-plagiasi" className="hover:text-[#8B0000] transition-colors">Cek Turnitin</Link>
            <Link href="/cek-ai" className="hover:text-[#8B0000] transition-colors">AI Detector</Link>
            <Link href="/cek-drillbit" className="hover:text-[#8B0000] transition-colors">DrillBit</Link>
            <Link href="/jasa-parafrase" className="hover:text-[#8B0000] transition-colors">Parafrase</Link>
            <Link href="/bimbingan" className="hover:text-[#8B0000] transition-colors">Bimbingan</Link>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild><Link href="/daftar">Daftar</Link></Button>
            <Button size="sm" asChild><Link href="/login">Login</Link></Button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-2xl px-4 py-12">
        {/* Header */}
        <div className="flex items-start gap-4 mb-8">
          <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl shadow-sm ${iconBg}`}>
            <Icon className={`h-6 w-6 ${iconColor}`} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">{serviceName}</h1>
            <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
          </div>
        </div>

        {/* Info strip */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { icon: Clock, text: `~${slaHours} jam`, label: "Estimasi" },
            { icon: FileCheck2, text: formats, label: "Format" },
            { icon: ShieldCheck, text: `Maks. ${maxSizeMb} MB`, label: "Ukuran" },
          ].map((s) => {
            const SIcon = s.icon;
            return (
              <div key={s.label} className="flex flex-col items-center gap-1 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-center shadow-card">
                <SIcon className="h-4 w-4 text-[#8B0000]" aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-800">{s.text}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
              </div>
            );
          })}
        </div>

        {note && (
          <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm mb-6">
            <Info className="h-4 w-4 flex-shrink-0 text-amber-600 mt-0.5" aria-hidden="true" />
            <p className="text-amber-800 leading-relaxed">{note}</p>
          </div>
        )}

        <div className="h-px bg-slate-100 mb-6" />

        {/* Step 1 — Upload */}
        {step === "upload" && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#8B0000] text-white text-xs font-bold">1</span>
              <p className="text-sm font-bold text-slate-700">Upload Dokumen</p>
            </div>
            <label htmlFor="file-upload"
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              className={cn(
                "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center cursor-pointer transition-all",
                isDragging ? "border-[#8B0000] bg-brand-50 scale-[1.01]" : "border-slate-200 hover:border-[#8B0000] hover:bg-brand-50/40"
              )}>
              <div className={cn("mb-4 flex h-14 w-14 items-center justify-center rounded-2xl transition-colors", isDragging ? "bg-[#8B0000] text-white" : "bg-slate-100 text-slate-400")}>
                <Upload className="h-6 w-6" aria-hidden="true" />
              </div>
              <p className="text-sm font-semibold text-slate-700 mb-1">
                {isDragging ? "Lepaskan file di sini" : "Seret & lepas file, atau klik untuk memilih"}
              </p>
              <p className="text-xs text-muted-foreground">{formats} · Maks. {maxSizeMb} MB</p>
              <input id="file-upload" type="file" accept=".pdf,.docx,.doc"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
                className="sr-only" aria-label="Upload dokumen" />
            </label>
            {error && (
              <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2.5" role="alert">
                <X className="h-4 w-4 flex-shrink-0 text-red-500" aria-hidden="true" />
                <p className="text-xs text-red-700 font-medium">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 2 — Confirm */}
        {step === "confirm" && selectedFile && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#8B0000] text-white text-xs font-bold">2</span>
              <p className="text-sm font-bold text-slate-700">Konfirmasi &amp; Lanjutkan</p>
            </div>

            {/* File info */}
            <div className="flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 flex-shrink-0">
                <CheckCircle2 className="h-5 w-5 text-[#8B0000]" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#6B0000] truncate">{selectedFile.name}</p>
                <p className="text-xs text-[#8B0000]">{formatBytes(selectedFile.size)} · Siap diproses</p>
              </div>
              <button onClick={() => { setSelectedFile(null); setStep("upload"); }}
                className="text-[#8B0000] hover:text-[#6B0000]" aria-label="Ganti file">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Summary */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-card">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ringkasan Pesanan</p>
              </div>
              <div className="px-4 py-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Layanan</span>
                  <span className="font-semibold">{serviceName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">File</span>
                  <span className="font-medium max-w-[200px] truncate text-right">{selectedFile.name}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-extrabold text-base">
                  <span>Total</span>
                  <span className="text-[#8B0000]">{fmt(servicePrice)}</span>
                </div>
              </div>
            </div>

            {/* Login required */}
            <div className="rounded-2xl border border-brand-100 bg-brand-50 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <LogIn className="h-4 w-4 text-[#8B0000] flex-shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-sm text-[#6B0000]">
                  <span className="font-semibold">Langkah terakhir:</span> Login atau buat akun gratis untuk menyelesaikan pembayaran dan menerima laporan.
                </p>
              </div>
              <div className="flex gap-3">
                <Button className="flex-1 gap-2" asChild>
                  <Link href={`/login?next=${encodeURIComponent(dashboardPath)}`}>
                    <LogIn className="h-4 w-4" aria-hidden="true" />
                    Login &amp; Lanjutkan
                  </Link>
                </Button>
                <Button variant="outline" className="flex-1 gap-2" asChild>
                  <Link href={`/daftar?next=${encodeURIComponent(dashboardPath)}`}>
                    Daftar Gratis
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>

            <Button variant="outline" onClick={() => { setSelectedFile(null); setStep("upload"); }}>
              Ganti File
            </Button>
          </div>
        )}

        {/* Trust badges */}
        <div className="mt-8 flex flex-wrap justify-center gap-5 text-xs text-slate-400">
          {["🔒 File aman & terenkripsi", "📄 Laporan akurat & terpercaya", "⚡ Proses cepat"].map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
