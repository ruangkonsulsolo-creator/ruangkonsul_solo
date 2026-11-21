"use client";

import { Printer } from "lucide-react";

/**
 * Memanggil dialog cetak peramban, yang punya pilihan "Save as PDF".
 *
 * Sengaja tidak memakai pustaka pembuat PDF. Dialog cetak peramban sudah
 * menghasilkan PDF yang benar, menghormati @media print, dan tidak menambah
 * satu pun dependensi yang harus dirawat dan ditambal. Pustaka PDF juga
 * menambah beberapa megabita ke bundel demi satu tombol.
 */
export function TombolCetak() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-light print:hidden"
    >
      <Printer className="h-4 w-4" aria-hidden="true" />
      Unduh PDF
    </button>
  );
}
