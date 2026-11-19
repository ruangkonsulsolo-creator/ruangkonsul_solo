"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { normalizeWhatsApp } from "@/lib/validators/whatsapp";

interface Props {
  value: string;
  onChange: (v: string) => void;
  /** tampilkan pesan error dari server */
  error?: string | null;
}

/**
 * Input nomor WhatsApp wajib sebelum bayar. Otomatis terisi dari profil.
 * Validasi final tetap di server (requireWhatsApp).
 */
export function WhatsAppField({ value, onChange, error }: Props) {
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (value) return;
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.whatsapp) {
          const local = String(j.whatsapp).replace(/^62/, "0");
          onChange(local);
        }
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const invalid = touched && value.length > 0 && !normalizeWhatsApp(value);
  const msg = error || (invalid ? "Format nomor tidak valid (contoh: 0812xxxxxxxx)." : null);

  return (
    <div className="space-y-1.5">
      <label htmlFor="wa-field" className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
        <MessageCircle className="h-3.5 w-3.5 text-green-600" aria-hidden="true" />
        Nomor WhatsApp <span className="text-red-500">*</span>
      </label>
      <input
        id="wa-field"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        placeholder="0812xxxxxxxx"
        className={`w-full rounded-md border px-3 py-2 text-sm ${msg ? "border-red-400" : "border-input"}`}
        aria-invalid={!!msg}
        aria-describedby="wa-help"
      />
      <p id="wa-help" className={`text-[11px] ${msg ? "text-red-600" : "text-muted-foreground"}`}>
        {msg ?? "Wajib — untuk notifikasi status pesanan & receipt."}
      </p>
    </div>
  );
}

export function isValidWhatsApp(v: string) {
  return !!normalizeWhatsApp(v);
}
