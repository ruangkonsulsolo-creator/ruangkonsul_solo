import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/ui/logo";
import { ArrowLeft } from "lucide-react";
import { BRAND } from "@/lib/brand";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex">

      {/* ── Panel kiri — brand ── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #6B0000 0%, #8B0000 50%, #A31515 100%)" }}>

        {/* Decorative circles */}
        <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-white/5" />
        <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-white/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-white/5" />

        {/* Tombol kembali */}
        <Link href="/" className="absolute top-5 left-5 z-20 flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium transition-colors">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Kembali ke Beranda
        </Link>

        <div className="relative z-10 flex flex-col items-center text-center">
          <Image
            src={BRAND.logoPng}
            alt={BRAND.name}
            width={110}
            height={110}
            className="mb-5 drop-shadow-xl object-contain"
            priority
            unoptimized
          />
          <h1 className="text-2xl font-extrabold text-white mb-1">{BRAND.name}</h1>
          <p className="text-white/70 text-sm max-w-xs leading-relaxed">{BRAND.tagline}</p>

          {/* Alamat */}
          <p className="mt-4 text-white/50 text-xs">{BRAND.address}</p>
          <p className="text-white/50 text-xs">{BRAND.whatsappDisplay}</p>

          {/* Stats */}
          <div className="mt-10 grid grid-cols-3 gap-6 w-full max-w-xs">
            {[
              { val: "1K+",  label: "Pengguna" },
              { val: "24 Jam", label: "Estimasi Selesai" },
              { val: "99%",  label: "Kepuasan" },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center">
                <span className="text-2xl font-extrabold text-white">{s.val}</span>
                <span className="text-[11px] text-white/60 mt-0.5 text-center">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Panel kanan — form ── */}
      <div className="flex flex-1 flex-col">

        {/* Mobile header */}
        <div className="lg:hidden border-b px-6 py-4 flex items-center justify-between">
          <Logo size="md" />
          <Link href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#8B0000] transition-colors">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Beranda
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-10">
          <div className="w-full max-w-md">
            {children}
          </div>
        </div>

        {/* Tombol kembali desktop (di bawah form) */}
        <div className="px-6 pb-4 flex justify-center">
          <Link href="/" className="hidden lg:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#8B0000] transition-colors">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Kembali ke Beranda
          </Link>
        </div>

        <p className="pb-6 text-center text-xs text-muted-foreground">
          © {BRAND.year} {BRAND.name}. Semua hak dilindungi.
        </p>
      </div>
    </div>
  );
}
