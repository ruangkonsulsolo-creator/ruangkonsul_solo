import type { Metadata } from "next";
import { NavbarUtama } from "@/components/ui/NavbarUtama";
import { HalamanLaporanManual } from "@/components/periksa/HalamanLaporanManual";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Status Pesanan Cek Plagiasi", robots: { index: false } };

/** Status pesanan laporan untuk semua pemesan, termasuk tamu (tanpa akun). */
export default function PesananCekPage({ params, searchParams }: { params: { id: string }; searchParams: { t?: string } }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <NavbarUtama />
      <main className="px-4 pb-16 pt-8">
        <HalamanLaporanManual
          id={params.id}
          kembali={{ href: "/cek-plagiarisme?tab=riwayat", label: "Riwayat Pesanan" }}
          urlLogin="/cek-plagiarisme?tab=riwayat"
          token={searchParams.t}
        />
      </main>
    </div>
  );
}
