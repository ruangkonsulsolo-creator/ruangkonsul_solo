"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUploadZone } from "./FileUploadZone";
import { PaymentModal } from "./PaymentModal";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/utils/format-currency";
import { PackageOpen, CreditCard, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { Toast, useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface ActiveQuota { id: string; quota_remaining: number; expires_at: string; }
interface OrderFormProps {
  serviceSlug: string;
  serviceName: string;
  servicePrice: number;
  activeQuota: ActiveQuota | null;
  maxFileSizeMb?: number;
}
type Step = "upload" | "confirm" | "processing" | "done";

export function OrderForm({ serviceSlug, serviceName, servicePrice, activeQuota, maxFileSizeMb = 50 }: OrderFormProps) {
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();

  const [step, setStep] = useState<Step>("upload");
  const [uploadedFile, setUploadedFile] = useState<{ file_id: string; original_name: string; file_size_bytes: number } | null>(null);
  const [useQuota, setUseQuota] = useState(!!activeQuota);
  const [submitting, setSubmitting] = useState(false);
  const [snapToken, setSnapToken] = useState<string | null>(null);

  async function handleSubmit() {
    if (!uploadedFile) return;
    setSubmitting(true);

    const res = await fetch("/api/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file_id: uploadedFile.file_id,
        service_slug: serviceSlug,
        use_quota_id: useQuota && activeQuota ? activeQuota.id : null,
      }),
    });

    const json = await res.json();
    if (!res.ok) { showToast(json.error ?? "Gagal membuat pesanan.", "error"); setSubmitting(false); return; }

    if (json.data.payment_method === "quota") {
      setStep("done");
    } else {
      setSnapToken(json.data.snap_token);
      setStep("processing");
    }
    setSubmitting(false);
  }

  if (step === "done") {
    return (
      <div className="flex flex-col items-center gap-5 py-10 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-50">
          <CheckCircle2 className="h-10 w-10 text-brand" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-xl font-extrabold text-slate-900">Pesanan Berhasil! 🎉</h3>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-xs mx-auto">
            <span className="font-semibold text-slate-700">{uploadedFile?.original_name}</span> sedang
            diproses tim kami. Notifikasi dikirim via WhatsApp.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => { setStep("upload"); setUploadedFile(null); setSnapToken(null); }}>
            Upload File Lain
          </Button>
          <Button onClick={() => router.push("/dashboard/riwayat-pesanan")} className="gap-2">
            Lihat Pesanan <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Step 1 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white text-xs font-bold">1</span>
            <p className="text-sm font-bold text-slate-700">Upload Dokumen</p>
          </div>
          <FileUploadZone
            onUploadSuccess={(f) => { setUploadedFile(f); setStep("confirm"); }}
            maxSizeMb={maxFileSizeMb}
            disabled={step !== "upload"}
          />
        </div>

        {/* Step 2 */}
        {step === "confirm" && uploadedFile && (
          <div className="space-y-5 animate-slide-up">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white text-xs font-bold">2</span>
              <p className="text-sm font-bold text-slate-700">Konfirmasi & Metode Bayar</p>
            </div>

            {/* Summary card */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-card">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ringkasan Pesanan</p>
              </div>
              <div className="px-4 py-3 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Layanan</span>
                  <span className="font-semibold">{serviceName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">File</span>
                  <span className="font-medium max-w-[200px] truncate text-right">{uploadedFile.original_name}</span>
                </div>
                <div className="border-t pt-2.5 flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span className={cn(useQuota && "line-through text-muted-foreground text-sm self-center font-normal")}>
                    {formatRupiah(servicePrice)}
                  </span>
                </div>
                {useQuota && (
                  <div className="flex justify-between text-brand font-bold text-base">
                    <span>Bayar Kuota</span>
                    <span>Gratis ✓</span>
                  </div>
                )}
              </div>
            </div>

            {/* Metode bayar */}
            <div className="space-y-2.5">
              {activeQuota && (
                <button
                  onClick={() => setUseQuota(true)}
                  className={cn(
                    "flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all",
                    useQuota ? "border-brand bg-brand-50 ring-1 ring-brand/30" : "border-slate-200 bg-white hover:border-brand-200"
                  )}
                  aria-pressed={useQuota}
                >
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0", useQuota ? "bg-brand text-white" : "bg-slate-100 text-slate-400")}>
                    <PackageOpen className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900">Pakai Kuota</p>
                    <p className="text-xs text-muted-foreground">
                      Sisa {activeQuota.quota_remaining}x · Exp {new Date(activeQuota.expires_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <span className="rounded-full bg-brand-50 text-brand text-[11px] font-bold px-2.5 py-1 border border-brand-200">Hemat</span>
                </button>
              )}

              <button
                onClick={() => setUseQuota(false)}
                className={cn(
                  "flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all",
                  !useQuota ? "border-brand bg-brand-50 ring-1 ring-brand/30" : "border-slate-200 bg-white hover:border-brand-200"
                )}
                aria-pressed={!useQuota}
              >
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0", !useQuota ? "bg-brand text-white" : "bg-slate-100 text-slate-400")}>
                  <CreditCard className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900">Bayar Sekarang</p>
                  <p className="text-xs text-muted-foreground">{formatRupiah(servicePrice)} · Transfer, QRIS, e-wallet</p>
                </div>
              </button>
            </div>

            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                onClick={() => { setStep("upload"); setUploadedFile(null); }}
                disabled={submitting}
              >
                Ganti File
              </Button>
              <Button onClick={handleSubmit} disabled={submitting} className="flex-1 gap-2" size="lg">
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Memproses...</>
                ) : useQuota ? (
                  <><CheckCircle2 className="h-4 w-4" /> Konfirmasi Pesanan</>
                ) : (
                  <>Lanjut Pembayaran <ArrowRight className="h-4 w-4" /></>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {step === "processing" && snapToken && (
        <PaymentModal snapToken={snapToken} onClose={() => { setStep("confirm"); setSnapToken(null); }} />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </>
  );
}
