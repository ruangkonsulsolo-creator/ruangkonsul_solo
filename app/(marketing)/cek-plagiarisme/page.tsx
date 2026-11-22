import type { Metadata } from "next";
import { NavbarUtama } from "@/components/ui/NavbarUtama";
import { KotakPeriksa } from "@/components/periksa/KotakPeriksa";
import { ambilTarifPeriksa } from "@/lib/periksa/tarif";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Cek Plagiarisme, AI & Parafrase",
  description:
    `Cek plagiasi Turnitin & DrillBit, deteksi tulisan AI, dan parafrase naskah skripsi/tesis di ${BRAND.name}. ` +
    "Bayar per kata lewat QRIS, laporan tersimpan di akunmu.",
};

// Dinamis: ?tab=riwayat membuka sub tab Riwayat Pesanan.
export const dynamic = "force-dynamic";

/**
 * Halaman khusus pemeriksa naskah. Sebelumnya ditanam di beranda; hasil dan
 * pesan galatnya menggulirkan layar beranda sendiri, jadi dipindah ke tab
 * "Cek Plagiarisme" di navbar.
 */
export default async function CekPlagiarismePage({ searchParams }: { searchParams: { tab?: string } }) {
  const tarif = await ambilTarifPeriksa();
  return (
    <div className="min-h-screen bg-slate-50">
      <NavbarUtama />
      <main id="periksa" className="px-4 pb-16 pt-10 lg:pt-14">
        <div className="mx-auto max-w-6xl">
          <div className="mb-3 flex items-center justify-center gap-2">
            <span className="h-0.5 w-8 rounded-full bg-brand" />
            <span className="text-xs font-bold uppercase tracking-widest text-brand">Cek Plagiarisme</span>
            <span className="h-0.5 w-8 rounded-full bg-brand" />
          </div>
          <h1 className="text-center text-2xl font-extrabold text-slate-900 lg:text-4xl">
            Cek tulisanmu sebelum diserahkan
          </h1>
          <p className="mx-auto mb-10 mt-3 max-w-2xl text-center font-medium text-slate-600">
            Plagiasi (Turnitin/DrillBit), deteksi AI, dan parafrase. Lihat bagian mana yang perlu sitasi
            atau ditulis ulang dengan kalimatmu sendiri — tujuannya memperbaiki cara mengutip, bukan
            mengakali pemeriksaan kampus. <b className="text-slate-800">Tidak perlu daftar akun.</b>
          </p>
          <KotakPeriksa
            tarif={tarif.tarif}
            aktif={tarif.aktif}
            manual={tarif.manual}
            minimum={tarif.minimum}
            awalRiwayat={searchParams.tab === "riwayat"}
          />
        </div>
      </main>
    </div>
  );
}
