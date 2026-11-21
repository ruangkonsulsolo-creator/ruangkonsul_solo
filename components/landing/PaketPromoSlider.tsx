"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { hargaRingkas, type PaketPromo } from "@/lib/landing/paket-promo-data";

/** Slider kartu paket jasa di beranda; isinya dikelola admin (Admin › Paket Promo). */
export function PaketPromoSlider({ paket }: { paket: PaketPromo[] }) {
  const jalur = useRef<HTMLUListElement>(null);
  const [bisaKiri, setBisaKiri] = useState(false);
  const [bisaKanan, setBisaKanan] = useState(false);

  const perbarui = useCallback(() => {
    const el = jalur.current;
    if (!el) return;
    setBisaKiri(el.scrollLeft > 4);
    setBisaKanan(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    perbarui();
    const el = jalur.current;
    el?.addEventListener("scroll", perbarui, { passive: true });
    window.addEventListener("resize", perbarui);
    return () => {
      el?.removeEventListener("scroll", perbarui);
      window.removeEventListener("resize", perbarui);
    };
  }, [perbarui]);

  const geser = (arah: -1 | 1) => {
    const el = jalur.current;
    if (!el) return;
    const kartu = el.querySelector("li");
    const lebar = kartu ? (kartu as HTMLElement).offsetWidth + 20 : el.clientWidth;
    el.scrollBy({ left: arah * lebar, behavior: "smooth" });
  };

  if (paket.length === 0) return null;

  return (
    <div className="relative">
      <ul
        ref={jalur}
        className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Paket layanan"
      >
        {paket.map((p) => (
          <li key={p.id} className="w-[82%] shrink-0 snap-start sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-14px)] xl:w-[calc(25%-15px)]">
            <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-card">
              {/* Harga */}
              <div className="px-5 pb-4 pt-6 text-center">
                <div className="flex items-end justify-center gap-1.5">
                  <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 text-[10px] font-extrabold text-brand">
                    Mulai
                  </span>
                  <span className="text-5xl font-extrabold leading-none tracking-tight text-brand">{hargaRingkas(p.harga_mulai)}</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{p.satuan}</p>
                {p.kategori && <p className="mt-2 text-sm font-semibold text-amber-600">{p.kategori}</p>}
              </div>

              {/* Poster */}
              <div className="relative aspect-[4/3] bg-brand-50">
                <Image
                  src={p.image_url}
                  alt={p.judul}
                  fill
                  sizes="(max-width: 640px) 82vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover object-top"
                  unoptimized={!/^\/|\.supabase\.co\/storage\//.test(p.image_url)}
                />
              </div>

              {/* Judul */}
              <h3 className="flex min-h-[5.5rem] items-center justify-center bg-brand px-5 py-4 text-center text-lg font-extrabold leading-snug text-white">
                {p.judul}
              </h3>

              {/* Fitur */}
              {p.fitur.length > 0 && (
                <ul className="flex-1 divide-y divide-brand-100 bg-brand-50/50">
                  {p.fitur.map((f, i) => (
                    <li key={i} className="px-5 py-3 text-center text-sm text-slate-700">{f}</li>
                  ))}
                </ul>
              )}

              <div className="p-5 pt-4">
                <Link
                  href={p.cta_href}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-light"
                >
                  {p.cta_label} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </article>
          </li>
        ))}
      </ul>

      {(bisaKiri || bisaKanan) && (
        <>
          <button type="button" onClick={() => geser(-1)} disabled={!bisaKiri} aria-label="Paket sebelumnya"
            className="absolute -left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl bg-brand text-white shadow-lg transition hover:bg-brand-light disabled:opacity-30 sm:flex lg:-left-5">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => geser(1)} disabled={!bisaKanan} aria-label="Paket berikutnya"
            className="absolute -right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl bg-brand text-white shadow-lg transition hover:bg-brand-light disabled:opacity-30 sm:flex lg:-right-5">
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}
    </div>
  );
}
