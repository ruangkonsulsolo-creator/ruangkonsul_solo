"use client";

import { useCallback, useState } from "react";
import { Upload, FileText, X, CheckCircle2, File } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadedFile {
  file_id: string;
  original_name: string;
  file_size_bytes: number;
}

interface FileUploadZoneProps {
  onUploadSuccess: (file: UploadedFile) => void;
  maxSizeMb?: number;
  disabled?: boolean;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ALLOWED_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

export function FileUploadZone({
  onUploadSuccess,
  maxSizeMb = 50,
  disabled = false,
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);

  function validate(file: File): string | null {
    if (!ALLOWED_MIME.includes(file.type))
      return "Format tidak didukung. Gunakan PDF, DOCX, atau DOC.";
    if (file.size > maxSizeMb * 1024 * 1024)
      return `Ukuran file melebihi batas ${maxSizeMb} MB.`;
    return null;
  }

  async function upload(file: File) {
    const err = validate(file);
    if (err) { setError(err); return; }

    setError(null);
    setUploading(true);
    setProgress(10);

    const fd = new FormData();
    fd.append("file", file);

    const interval = setInterval(() => setProgress((p) => Math.min(p + 12, 85)), 300);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      clearInterval(interval);
      setProgress(100);

      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Upload gagal."); return; }

      setUploadedFile(json.data);
      onUploadSuccess(json.data);
    } catch {
      setError("Koneksi gagal. Coba lagi.");
    } finally {
      setUploading(false);
    }
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled || uploading) return;
      const file = e.dataTransfer.files[0];
      if (file) upload(file);
    },
    [disabled, uploading]
  );

  if (uploadedFile) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 flex-shrink-0">
          <CheckCircle2 className="h-5 w-5 text-brand" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-brand-dark truncate">{uploadedFile.original_name}</p>
          <p className="text-xs text-brand">{formatBytes(uploadedFile.file_size_bytes)} · Berhasil diupload</p>
        </div>
        <button
          onClick={() => { setUploadedFile(null); setError(null); setProgress(0); }}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-brand hover:bg-brand-100 transition-colors"
          aria-label="Ganti file"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <label
        htmlFor="file-upload"
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center cursor-pointer transition-all",
          isDragging
            ? "border-brand bg-brand-50 scale-[1.01]"
            : "border-slate-200 hover:border-brand hover:bg-brand-50/50",
          (disabled || uploading) && "cursor-not-allowed opacity-50 pointer-events-none"
        )}
      >
        {uploading ? (
          <div className="w-full max-w-xs space-y-4">
            <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-brand-50">
              <File className="h-7 w-7 text-brand animate-pulse" aria-hidden="true" />
            </div>
            <p className="text-sm font-semibold text-slate-700">Mengunggah dokumen...</p>
            <div className="w-full rounded-full bg-slate-200 h-2 overflow-hidden">
              <div
                className="h-2 rounded-full bg-brand transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{progress}%</p>
          </div>
        ) : (
          <>
            <div className={cn(
              "mb-4 flex h-14 w-14 items-center justify-center rounded-2xl transition-colors",
              isDragging ? "bg-brand text-white" : "bg-slate-100 text-slate-400"
            )}>
              <Upload className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="text-sm font-semibold text-slate-700 mb-1">
              {isDragging ? "Lepaskan file di sini" : "Seret & lepas file, atau klik untuk memilih"}
            </p>
            <p className="text-xs text-muted-foreground">PDF, DOCX, DOC · Maks. {maxSizeMb} MB</p>
          </>
        )}

        <input
          id="file-upload" type="file" accept=".pdf,.docx,.doc"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }}
          disabled={disabled || uploading}
          className="sr-only"
          aria-label="Upload dokumen"
        />
      </label>

      {error && (
        <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2.5" role="alert">
          <X className="h-4 w-4 flex-shrink-0 text-red-500" aria-hidden="true" />
          <p className="text-xs text-red-700 font-medium">{error}</p>
        </div>
      )}
    </div>
  );
}
