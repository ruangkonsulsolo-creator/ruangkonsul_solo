import type { Metadata } from "next";
import { HalamanLaporanManual } from "@/components/periksa/HalamanLaporanManual";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Status Pesanan Cek Plagiasi", robots: { index: false } };

export default function LaporanPage({ params }: { params: { id: string } }) {
  return (
    <HalamanLaporanManual
      id={params.id}
      kembali={{ href: "/dashboard/riwayat-pesanan", label: "Riwayat Pesanan" }}
      urlLogin={`/login?next=/dashboard/laporan/${params.id}`}
    />
  );
}
