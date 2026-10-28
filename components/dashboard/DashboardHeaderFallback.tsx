import Link from "next/link";

/** Header ringan tanpa koneksi Supabase — tampil saat belum login atau DB belum ready */
export function DashboardHeaderFallback() {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-100 bg-white/95 backdrop-blur-sm px-4 lg:px-6 shadow-sm">
      <div className="pl-12 lg:pl-0" />
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="rounded-xl bg-brand px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-light transition-colors shadow-brand-sm"
        >
          Login
        </Link>
      </div>
    </header>
  );
}
