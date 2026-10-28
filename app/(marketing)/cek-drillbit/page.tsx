import { PublicOrderForm } from "@/components/landing/PublicOrderForm";
import { BookOpenCheck } from "lucide-react";
import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";
export const metadata: Metadata = { title: `Cek DrillBit Online | ${BRAND.name}`, description: `Cek plagiasi dengan mesin DrillBit resmi yang digunakan kampus Indonesia dari ${BRAND.name}.` };
export default function CekDrillbitPublicPage() {
  return <PublicOrderForm serviceSlug="drillbit" serviceName="Cek DrillBit" servicePrice={45000} slaHours={48} formats="PDF, DOCX" maxSizeMb={20} icon={BookOpenCheck} iconColor="text-brand" iconBg="bg-brand-50" description="Cek plagiasi menggunakan mesin DrillBit resmi yang digunakan oleh kampus-kampus di Indonesia. Laporan resmi siap digunakan untuk keperluan sidang." />;
}
