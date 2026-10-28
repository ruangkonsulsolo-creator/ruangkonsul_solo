"use client";

import Link from "next/link";
import { AlertTriangle, PackageOpen, ArrowRight, X } from "lucide-react";
import { useState } from "react";

interface QuotaInfo {
  id: string;
  quota_remaining: number;
  expires_at: string;
  service_name: string;
}

interface QuotaBannerProps {
  quotas: QuotaInfo[];
}

function daysLeft(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

export function QuotaBanner({ quotas }: QuotaBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || quotas.length === 0) return null;

  // Cari kuota yang perlu warning: sisa <= 3 ATAU kedaluwarsa <= 7 hari
  const warnings = quotas.filter(
    (q) => q.quota_remaining <= 3 || daysLeft(q.expires_at) <= 7
  );

  if (warnings.length === 0) return null;

  const first = warnings[0];
  const days = daysLeft(first.expires_at);
  const isExpirySoon = days <= 7;
  const isLowQuota = first.quota_remaining <= 3;

  let message = "";
  if (isExpirySoon && isLowQuota) {
    message = `Kuota ${first.service_name} tinggal ${first.quota_remaining}× dan kedaluwarsa dalam ${days} hari!`;
  } else if (isExpirySoon) {
    message = `Kuota ${first.service_name} kedaluwarsa dalam ${days} hari — segera gunakan!`;
  } else {
    message = `Kuota ${first.service_name} hampir habis, hanya tersisa ${first.quota_remaining}× lagi.`;
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm shadow-sm">
      <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-500" aria-hidden="true" />
      <p className="flex-1 text-amber-800 font-medium">{message}</p>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link
          href="/paket-hemat"
          className="flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-light transition-colors"
        >
          <PackageOpen className="h-3.5 w-3.5" aria-hidden="true" />
          Beli Lagi
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
        <button
          onClick={() => setDismissed(true)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-amber-500 hover:bg-amber-100 transition-colors"
          aria-label="Tutup peringatan"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
