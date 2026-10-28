import { PublicOrderForm } from "@/components/landing/PublicOrderForm";
import { FileSearch } from "lucide-react";
import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";
export const metadata: Metadata = { title: `Cek Plagiasi Online | ${BRAND.name}`, description: `Cek plagiasi dokumenmu dengan laporan Turnitin. Bayar per file, tanpa langganan. Dari ${BRAND.name}.` };
export default function CekPlagiasiPublicPage() {
  return <PublicOrderForm serviceSlug="plagiasi" serviceName="Cek Plagiasi" servicePrice={35000} slaHours={24} formats="PDF, DOCX, DOC" maxSizeMb={50} icon={FileSearch} iconColor="text-brand" iconBg="bg-brand-50" description="Deteksi kemiripan teks dokumenmu dengan laporan persentase lengkap dan highlight sumber. No Repository — tidak masuk database Turnitin." />;
}
