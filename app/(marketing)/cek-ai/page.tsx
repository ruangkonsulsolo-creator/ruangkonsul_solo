import { PublicOrderForm } from "@/components/landing/PublicOrderForm";
import { Bot } from "lucide-react";
import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";
export const metadata: Metadata = { title: `AI Detector Online | ${BRAND.name}`, description: `Deteksi teks yang ditulis AI dalam dokumenmu. GPT Zero Detector dari ${BRAND.name}.` };
export default function CekAIPublicPage() {
  return <PublicOrderForm serviceSlug="ai-detector" serviceName="AI Detector" servicePrice={25000} slaHours={12} formats="PDF, DOCX, DOC" maxSizeMb={50} icon={Bot} iconColor="text-brand" iconBg="bg-brand-50" description="Identifikasi proporsi teks yang ditulis oleh AI dalam dokumenmu dengan skor per paragraf. Hasil akurat dan terpercaya." />;
}
