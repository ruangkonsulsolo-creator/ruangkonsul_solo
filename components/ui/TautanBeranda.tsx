import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Jalan pulang dari panel ke beranda.
 *
 * Ketiga panel — member, mentor, dan admin — sebelumnya tidak punya satu
 * pun tautan keluar selain "Keluar", yang artinya logout. Jadi satu-satunya
 * cara kembali melihat situsnya adalah menyunting alamat di bilah URL, dan
 * sebagian orang akan menyimpulkan bahwa untuk melihat beranda mereka harus
 * keluar dari akunnya dulu.
 *
 * Server component karena isinya cuma tautan statis; tidak ada alasan
 * mengirimkan JavaScript untuk ini.
 */
export function TautanBeranda() {
  return (
    <Link
      href="/"
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-brand hover:text-brand"
    >
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="hidden sm:inline">Beranda</span>
    </Link>
  );
}
