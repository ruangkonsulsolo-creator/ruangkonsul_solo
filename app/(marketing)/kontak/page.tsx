import type { Metadata } from "next";
import { Mail, MapPin, MessageCircle, Instagram, Clock } from "lucide-react";
import { BRAND, waLink } from "@/lib/brand";
import { HalamanLegal, type BagianLegal } from "@/components/legal/HalamanLegal";

export const metadata: Metadata = {
  title: `Kontak | ${BRAND.name}`,
  description: `Hubungi ${BRAND.name}: WhatsApp, email, Instagram, dan alamat.`,
};

const kartu = "flex items-start gap-3 rounded-2xl border border-slate-200 p-4 transition-colors hover:border-brand";

const bagian: BagianLegal[] = [
  {
    judul: "Cara menghubungi kami",
    isi: (
      <div className="grid gap-3 sm:grid-cols-2">
        <a href={waLink("Halo, saya mau bertanya.")} target="_blank" rel="noopener noreferrer" className={kartu}>
          <MessageCircle className="mt-0.5 h-5 w-5 text-green-600" aria-hidden="true" />
          <span><b className="block text-slate-900">WhatsApp Admin</b>{BRAND.whatsappDisplay}</span>
        </a>
        <a href={`mailto:${BRAND.email}`} className={kartu}>
          <Mail className="mt-0.5 h-5 w-5 text-brand" aria-hidden="true" />
          <span><b className="block text-slate-900">Email</b>{BRAND.email}</span>
        </a>
        <a href={BRAND.instagramUrl} target="_blank" rel="noopener noreferrer" className={kartu}>
          <Instagram className="mt-0.5 h-5 w-5 text-pink-600" aria-hidden="true" />
          <span><b className="block text-slate-900">Instagram</b>{BRAND.instagram}</span>
        </a>
        <a href={BRAND.mapsUrl} target="_blank" rel="noopener noreferrer" className={kartu}>
          <MapPin className="mt-0.5 h-5 w-5 text-brand" aria-hidden="true" />
          <span><b className="block text-slate-900">Alamat</b>{BRAND.address}</span>
        </a>
      </div>
    ),
  },
  {
    judul: "Jam layanan",
    isi: (
      <p className="flex items-start gap-2">
        <Clock className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
        <span>
          Admin membalas chat setiap hari pukul 08.00–21.00 WIB. Pembayaran QRIS dan layanan otomatis (Cek AI, parafrase)
          berjalan 24 jam.
        </span>
      </p>
    ),
  },
  {
    judul: "Nomor notifikasi otomatis",
    isi: (
      <p>
        Notifikasi pesanan dikirim dari nomor <b>{BRAND.whatsappNotifDisplay}</b>. Nomor itu khusus pengiriman otomatis;
        untuk pertanyaan, keluhan, atau refund, hubungi WhatsApp Admin di atas dengan menyertakan kode pesananmu.
      </p>
    ),
  },
];

export default function KontakPage() {
  return <HalamanLegal judul="Kontak" diperbarui="22 November 2026" bagian={bagian} aktif="/kontak" />;
}
