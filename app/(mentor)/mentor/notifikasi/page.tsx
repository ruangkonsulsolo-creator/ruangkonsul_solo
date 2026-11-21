import type { Metadata } from "next";
import { DaftarNotifikasi } from "@/components/notifikasi/DaftarNotifikasi";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Notifikasi | ${BRAND.name}` };

export default function NotifikasiPage() {
  return <DaftarNotifikasi asal="/mentor/notifikasi" />;
}
