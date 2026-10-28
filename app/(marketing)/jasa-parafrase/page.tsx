import { PublicOrderForm } from "@/components/landing/PublicOrderForm";
import { PenLine } from "lucide-react";
import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";
export const metadata: Metadata = { title: `Jasa Parafrase Online | ${BRAND.name}`, description: `Penulisan ulang dokumen profesional dari ${BRAND.name}. Mulai dari Rp 75.000/halaman.` };
export default function JasaParafrasePublicPage() {
  return <PublicOrderForm serviceSlug="parafrase" serviceName="Jasa Parafrase" servicePrice={75000} slaHours={72} formats="PDF, DOCX, DOC" maxSizeMb={50} icon={PenLine} iconColor="text-brand" iconBg="bg-brand-50" description={`Penulisan ulang dokumen secara profesional oleh tim ${BRAND.name}. Dapat menurunkan plagiasi hingga 80% tanpa mengubah substansi tulisan.`} note="Harga dihitung per halaman. Admin akan konfirmasi total harga setelah dokumen diterima. Mulai dari Rp 75.000/halaman." />;
}
