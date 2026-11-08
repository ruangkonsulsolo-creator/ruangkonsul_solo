"use client";

import { useState } from "react";
import Image from "next/image";
import { ImagePlus } from "lucide-react";

/**
 * Galeri foto produk: satu foto besar dengan deretan thumbnail di bawahnya.
 *
 * Client component karena pemilihan thumbnail perlu state. Daftar fotonya
 * sendiri dipindai di server (lib/merchandise/foto.ts) lalu dioper ke sini,
 * supaya komponen ini tidak menyentuh berkas sama sekali.
 */
export function GaleriProduk({
  foto,
  nama,
}: {
  foto: string[];
  nama: string;
}) {
  const [aktif, setAktif] = useState(0);

  if (foto.length === 0) {
    return (
      <div className="flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center">
        <ImagePlus className="h-10 w-10 text-slate-300" aria-hidden="true" />
        <p className="text-sm font-semibold text-slate-600">
          Foto produk belum dipasang
        </p>
        <p className="text-xs leading-relaxed text-slate-500">
          Taruh foto persegi 1000 × 1000 px di folder produk ini, lalu
          jalankan ulang <code className="font-mono">npm run dev</code>.
        </p>
      </div>
    );
  }

  const terpilih = foto[Math.min(aktif, foto.length - 1)];

  return (
    <div>
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <Image
          src={terpilih}
          alt={`${nama} — foto ${aktif + 1}`}
          fill
          sizes="(min-width: 1024px) 480px, 100vw"
          className="object-contain p-2"
          priority
        />
      </div>

      {foto.length > 1 && (
        <ul className="mt-3 flex flex-wrap gap-3">
          {foto.map((src, i) => (
            <li key={src}>
              <button
                type="button"
                onClick={() => setAktif(i)}
                aria-label={`Lihat foto ${i + 1} dari ${foto.length}`}
                aria-current={i === aktif}
                className={`relative block h-16 w-16 overflow-hidden rounded-xl border-2 transition-colors ${
                  i === aktif
                    ? "border-brand"
                    : "border-slate-200 hover:border-slate-400"
                }`}
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
