"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Toast, useToast } from "@/components/ui/toast";
import {
  Download, Upload, CheckCircle2, XCircle, Play, Loader2,
} from "lucide-react";

interface OrderDetailPanelProps {
  order: {
    id: string;
    order_number: string;
    status: string;
    price_idr: number;
    payment_method: string | null;
    created_at: string;
    completed_at: string | null;
    admin_notes: string | null;
    report_storage_path: string | null;
    report_uploaded_at: string | null;
    services: { name: string; slug: string } | null;
    profiles: { full_name: string | null; whatsapp: string | null } | null;
    uploaded_files: { original_name: string; storage_path: string } | null;
  };
  documentDownloadUrl: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "success" | "warning" | "info" | "destructive" | "secondary" }> = {
  menunggu_pembayaran: { label: "Menunggu Bayar", variant: "warning" },
  dibayar:    { label: "Dibayar",    variant: "info" },
  diproses:   { label: "Diproses",   variant: "info" },
  selesai:    { label: "Selesai",    variant: "success" },
  dibatalkan: { label: "Dibatalkan", variant: "destructive" },
};

export function OrderDetailPanel({ order, documentDownloadUrl }: OrderDetailPanelProps) {
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();

  const [adminNotes, setAdminNotes] = useState(order.admin_notes ?? "");
  const [cancelReason, setCancelReason] = useState("");
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null); // status yang sedang diproses

  const st = STATUS_CONFIG[order.status] ?? { label: order.status, variant: "secondary" as const };

  async function uploadReport() {
    if (!reportFile) return;
    setUploading(true);

    const fd = new FormData();
    fd.append("order_id", order.id);
    fd.append("report", reportFile);

    const res = await fetch("/api/admin/report/upload", { method: "POST", body: fd });
    const json = await res.json();

    if (!res.ok) {
      showToast(json.error ?? "Gagal upload laporan.", "error");
    } else {
      showToast("Laporan berhasil diupload!", "success");
      setReportFile(null);
      router.refresh();
    }
    setUploading(false);
  }

  async function updateStatus(status: string) {
    if (status === "dibatalkan" && !cancelReason.trim()) {
      showToast("Alasan pembatalan wajib diisi.", "error");
      return;
    }

    setSubmitting(status);

    const body: Record<string, string> = { status };
    if (adminNotes) body.admin_notes = adminNotes;
    if (status === "dibatalkan") body.cancel_reason = cancelReason;

    const res = await fetch(`/api/admin/order/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await res.json();

    if (!res.ok) {
      showToast(json.error ?? "Gagal memperbarui pesanan.", "error");
    } else {
      showToast(`Status diperbarui: ${STATUS_CONFIG[status]?.label ?? status}`, "success");
      router.refresh();
    }
    setSubmitting(null);
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kiri: detail pesanan */}
        <div className="lg:col-span-2 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">{order.order_number}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {new Date(order.created_at).toLocaleString("id-ID", {
                  dateStyle: "long", timeStyle: "short",
                })}
              </p>
            </div>
            <Badge variant={st.variant}>{st.label}</Badge>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-4 rounded-lg border p-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">User</p>
              <p className="font-medium">{order.profiles?.full_name ?? "-"}</p>
              <p className="text-xs text-muted-foreground">{order.profiles?.whatsapp ?? ""}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Layanan</p>
              <p className="font-medium">{order.services?.name ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pembayaran</p>
              <p className="font-medium">
                {order.price_idr === 0
                  ? "Kuota"
                  : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(order.price_idr)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Metode</p>
              <p className="font-medium capitalize">{order.payment_method ?? "-"}</p>
            </div>
          </div>

          {/* Download dokumen user */}
          <div className="rounded-lg border p-4">
            <p className="text-sm font-semibold text-slate-800 mb-2">Dokumen User</p>
            <p className="text-sm text-slate-600 mb-3">{order.uploaded_files?.original_name ?? "-"}</p>
            {documentDownloadUrl ? (
              <a
                href={documentDownloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Unduh Dokumen
              </a>
            ) : (
              <p className="text-xs text-muted-foreground">Link unduh tidak tersedia.</p>
            )}
          </div>

          {/* Upload laporan */}
          <div className="rounded-lg border p-4">
            <p className="text-sm font-semibold text-slate-800 mb-2">Upload Laporan Hasil</p>
            {order.report_storage_path && (
              <p className="mb-2 text-xs text-brand flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                Laporan sudah diupload
                {order.report_uploaded_at && ` (${new Date(order.report_uploaded_at).toLocaleDateString("id-ID")})`}
              </p>
            )}
            <div className="flex items-center gap-3">
              <label className="cursor-pointer rounded-md border px-3 py-1.5 text-xs hover:bg-slate-50 flex items-center gap-1.5">
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                {reportFile ? reportFile.name : "Pilih PDF"}
                <input
                  type="file"
                  accept="application/pdf"
                  className="sr-only"
                  onChange={(e) => setReportFile(e.target.files?.[0] ?? null)}
                />
              </label>
              {reportFile && (
                <Button
                  size="sm"
                  onClick={uploadReport}
                  disabled={uploading}
                  className="gap-1.5"
                >
                  {uploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {uploading ? "Mengupload..." : "Upload"}
                </Button>
              )}
            </div>
          </div>

          {/* Catatan admin */}
          <div className="rounded-lg border p-4">
            <label
              htmlFor="admin-notes"
              className="block text-sm font-semibold text-slate-800 mb-2"
            >
              Catatan Admin (opsional)
            </label>
            <textarea
              id="admin-notes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none"
              placeholder="Catatan untuk referensi internal..."
            />
          </div>
        </div>

        {/* Kanan: aksi status */}
        <div className="space-y-4">
          <div className="rounded-lg border p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-800">Ubah Status</p>

            {order.status !== "diproses" && order.status !== "selesai" && order.status !== "dibatalkan" && (
              <Button
                className="w-full gap-2"
                onClick={() => updateStatus("diproses")}
                disabled={!!submitting}
              >
                {submitting === "diproses" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Tandai Diproses
              </Button>
            )}

            {(order.status === "diproses" || order.status === "dibayar") && (
              <Button
                className="w-full gap-2 bg-brand hover:bg-brand-light"
                onClick={() => updateStatus("selesai")}
                disabled={!!submitting || !order.report_storage_path}
              >
                {submitting === "selesai" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Tandai Selesai
              </Button>
            )}

            {!order.report_storage_path && order.status === "diproses" && (
              <p className="text-xs text-amber-600">
                Upload laporan dulu sebelum menandai selesai.
              </p>
            )}

            {order.status !== "selesai" && order.status !== "dibatalkan" && (
              <div className="pt-2 border-t space-y-2">
                <label htmlFor="cancel-reason" className="block text-xs font-medium text-slate-700">
                  Alasan pembatalan
                </label>
                <textarea
                  id="cancel-reason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                  placeholder="Wajib diisi jika membatalkan..."
                />
                <Button
                  variant="destructive"
                  className="w-full gap-2"
                  onClick={() => updateStatus("dibatalkan")}
                  disabled={!!submitting || !cancelReason.trim()}
                >
                  {submitting === "dibatalkan" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  Batalkan Pesanan
                </Button>
              </div>
            )}
          </div>

          {/* Status timeline ringkas */}
          <div className="rounded-lg border p-4">
            <p className="text-xs font-semibold text-slate-700 mb-3">Timeline</p>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <p>📥 Pesanan dibuat: {new Date(order.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</p>
              {order.completed_at && (
                <p>✅ Selesai: {new Date(order.completed_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</p>
              )}
              {order.report_uploaded_at && (
                <p>📄 Laporan diupload: {new Date(order.report_uploaded_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </>
  );
}
