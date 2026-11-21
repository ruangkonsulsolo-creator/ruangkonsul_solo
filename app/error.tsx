"use client";

import { useEffect } from "react";
import Link from "next/link";

/** Halaman galat ramah pengguna; mencegah layar "Application error" bawaan. */
export default function GalatHalaman({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[halaman]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <p className="text-5xl" aria-hidden="true">😕</p>
      <h1 className="mt-4 text-xl font-extrabold text-slate-900">Ada yang tidak beres</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        Halaman ini gagal dimuat. Coba muat ulang; kalau masih terjadi, hubungi admin dan sebutkan kode di bawah.
      </p>
      {error.digest && <p className="mt-2 font-mono text-xs text-slate-400">Kode: {error.digest}</p>}
      <div className="mt-6 flex gap-3">
        <button type="button" onClick={reset}
          className="rounded-lg bg-[#8B0000] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6B0000]">
          Coba lagi
        </button>
        <Link href="/" className="rounded-lg border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Ke beranda
        </Link>
      </div>
    </div>
  );
}
