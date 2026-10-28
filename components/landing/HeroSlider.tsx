"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { BRAND, waLink } from "@/lib/brand";

const slides = [
  {
    src: "/promo-bimbingan.jpeg",
    alt: `Kelas Bimbingan Private — ${BRAND.name}`,
    badge: "🎓 Bimbingan Private",
    hook: "Sampai ACC Sidang!",
    cta: "Daftar Sekarang",
    href: "/daftar",
  },
  {
    src: "/promo-bundling.jpeg",
    alt: `Paket Bundling Hemat — ${BRAND.name}`,
    badge: "💰 Paket Bundling",
    hook: "Hemat Lebih Banyak!",
    cta: "Lihat Paket",
    href: "/paket-hemat",
  },
  {
    src: "/promo-konsultasi.jpeg",
    alt: `Konsultasi Skripsi — ${BRAND.name}`,
    badge: "💬 Konsultasi Akademik",
    hook: "Konsultasi Langsung!",
    cta: "Mulai Konsultasi",
    href: "/daftar",
  },
  {
    src: "/promo-parafrase.jpeg",
    alt: `Jasa Parafrase Profesional — ${BRAND.name}`,
    badge: "✍️ Jasa Parafrase",
    hook: "Turunkan Plagiasi!",
    cta: "Order Parafrase",
    href: "/jasa-parafrase",
  },
];

const INTERVAL = 3500;

export function HeroSlider() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length);
    }, INTERVAL);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative w-full max-w-sm lg:max-w-md xl:max-w-lg flex-shrink-0" aria-label="Promo slide">
      <div className="relative overflow-hidden rounded-3xl shadow-brand aspect-[4/5]">
        {slides.map((slide, i) => (
          <div
            key={slide.src}
            className={`absolute inset-0 transition-all duration-700 ease-in-out ${
              i === current ? "opacity-100 scale-100 z-10" : "opacity-0 scale-[1.02] z-0 pointer-events-none"
            }`}
            aria-hidden={i !== current}
          >
            <Image src={slide.src} alt={slide.alt} fill
              className="object-cover object-top" sizes="(max-width: 768px) 100vw, 500px" priority={i === 0} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 pt-8">
              <span className="inline-flex items-center rounded-full bg-white/25 backdrop-blur-md border border-white/30 text-white text-[11px] font-bold px-3 py-1 mb-2">
                {slide.badge}
              </span>
              <p className="text-white font-extrabold text-xl leading-snug mb-3 drop-shadow-lg">{slide.hook}</p>
              <Link href={slide.href}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white text-[#8B0000] text-sm font-extrabold px-4 py-2 hover:bg-brand-50 transition-colors shadow-md">
                {slide.cta} →
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-2 mt-3" role="tablist">
        {slides.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)} role="tab"
            aria-selected={i === current} aria-label={`Slide ${i + 1}`}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === current ? "w-7 bg-[#8B0000] shadow-brand-sm" : "w-2 bg-slate-300 hover:bg-brand-300"
            }`} />
        ))}
      </div>
    </div>
  );
}
