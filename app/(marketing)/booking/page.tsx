import { BookingForm } from "@/components/landing/BookingForm";
import { BRAND } from "@/lib/brand";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `Book Bimbingan | ${BRAND.name}`,
  description: `Booking sesi bimbingan skripsi, tesis, lomba, atau olah data dengan mentor ${BRAND.name}.`,
};

export default async function BookingPage() {
  // Ambil mentor yang tersedia (tanpa login)
  let mentors: any[] = [];
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    const { data } = await supabase
      .from("mentor_profiles")
      .select("id, bio, specializations, price_per_hour, rating_avg, session_count, profiles(full_name)")
      .eq("is_active", true)
      .eq("is_available", true);
    mentors = data ?? [];
  } catch { /* fallback empty */ }

  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Image src={BRAND.logoPng} alt={BRAND.name} width={28} height={28} unoptimized className="object-contain" />
            <span className="text-lg font-extrabold text-[#8B0000]">{BRAND.shortName}</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/daftar" className="rounded-lg border-2 border-[#8B0000] px-3 py-1.5 text-sm font-semibold text-[#8B0000] hover:bg-brand-50 transition-colors">Daftar</Link>
            <Link href="/login" className="rounded-lg bg-[#8B0000] px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-light transition-colors">Login</Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-0.5 w-8 bg-[#8B0000] rounded-full" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#8B0000]">Bimbingan</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Book Sesi Bimbingan</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Isi form di bawah untuk memesan sesi bimbingan. Tidak perlu login — tim kami akan konfirmasi via WhatsApp.
          </p>
        </div>
        <BookingForm mentors={mentors} />
      </div>
    </div>
  );
}
