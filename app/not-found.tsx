import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";

export default function NotFound() {
  return (
    <div className="min-h-screen hero-gradient flex flex-col items-center justify-center px-4 text-center">
      <Image src={BRAND.logoPng} alt={BRAND.name} width={64} height={64} className="mb-6 opacity-80" unoptimized />
      <p className="text-[#8B0000] font-extrabold text-7xl mb-2">404</p>
      <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Halaman tidak ditemukan</h1>
      <p className="text-slate-500 text-sm mb-8 max-w-xs">
        Halaman yang kamu cari tidak ada atau sudah dipindahkan.
      </p>
      <div className="flex gap-3">
        <Button variant="outline" asChild>
          <Link href="/" className="gap-2">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Kembali
          </Link>
        </Button>
        <Button asChild>
          <Link href="/" className="gap-2">
            <Home className="h-4 w-4" aria-hidden="true" />
            Ke Beranda
          </Link>
        </Button>
      </div>
    </div>
  );
}
