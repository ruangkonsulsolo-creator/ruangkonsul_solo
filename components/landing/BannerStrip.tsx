"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Banner {
  id: string;
  title: string;
  image_url: string;
  link_url: string | null;
}

// Static fallback — diganti data DB setelah admin upload banner
const STATIC_BANNERS: Banner[] = [
  {
    id: "static-1",
    title: "Kelas Bimbingan Private Skripsi & Tesis",
    image_url: "/promo-bimbingan.jpeg",
    link_url: "/bimbingan",
  },
  {
    id: "static-2",
    title: "Paket Bundling Hemat Turnitin + Parafrase",
    image_url: "/promo-bundling.jpeg",
    link_url: "/paket-hemat",
  },
  {
    id: "static-3",
    title: "Konsultasi Proposal & Skripsi",
    image_url: "/promo-konsultasi.jpeg",
    link_url: "/bimbingan",
  },
  {
    id: "static-4",
    title: "Jasa Parafrase Profesional",
    image_url: "/promo-parafrase.jpeg",
    link_url: "/jasa-parafrase",
  },
];

const INTERVAL = 4500;

export function BannerStrip() {
  const [banners, setBanners] = useState<Banner[]>(STATIC_BANNERS);
  const [current, setCurrent] = useState(0);

  // Fetch banner dari DB — fallback ke static jika gagal/kosong
  useEffect(() => {
    fetch("/api/banners")
      .then((r) => r.json())
      .then((json) => {
        if (json.data?.length > 0) setBanners(json.data);
      })
      .catch(() => {/* pakai static */});
  }, []);

  const next = useCallback(() => setCurrent((c) => (c + 1) % banners.length), [banners.length]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + banners.length) % banners.length), [banners.length]);

  // Auto-slide
  useEffect(() => {
    const id = setInterval(next, INTERVAL);
    return () => clearInterval(id);
  }, [next]);

  if (banners.length === 0) return null;

  const banner = banners[current];

  const inner = (
    <div className="relative w-full aspect-[4/1] sm:aspect-[6/1] lg:aspect-[8/1] overflow-hidden bg-brand-50">
      {banners.map((b, i) => (
        <div
          key={b.id}
          className={`absolute inset-0 transition-all duration-700 ease-in-out ${
            i === current ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
          aria-hidden={i !== current}
        >
          <Image
            src={b.image_url}
            alt={b.title}
            fill
            className="object-cover object-center"
            sizes="100vw"
            priority={i === 0}
          />
          {/* Overlay gradient kiri */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-transparent" />
        </div>
      ))}

      {/* Navigasi */}
      {banners.length > 1 && (
        <>
          <button
            onClick={(e) => { e.preventDefault(); prev(); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-slate-700 hover:bg-white shadow transition-all"
            aria-label="Banner sebelumnya"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); next(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-slate-700 hover:bg-white shadow transition-all"
            aria-label="Banner berikutnya"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.preventDefault(); setCurrent(i); }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === current ? "w-5 bg-white" : "w-1.5 bg-white/50"
                }`}
                aria-label={`Banner ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="w-full border-y border-slate-100 shadow-sm" aria-label="Banner iklan">
      {banner.link_url ? (
        <a href={banner.link_url} className="block">
          {inner}
        </a>
      ) : inner}
    </div>
  );
}
