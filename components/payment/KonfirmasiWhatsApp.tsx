"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Truck } from "lucide-react";
import { BRAND } from "@/lib/brand";

const KUNCI_PRODI = "rk_prodi";

/**
 * Langkah utama setelah lunas: konfirmasi ke admin lewat WhatsApp dengan
 * pesan siap kirim (nama, prodi, produk, nomor receipt).
 *  - "kirim"   : produk fisik/merchandise → minta konfirmasi pengiriman & resi
 *  - "layanan" : bimbingan & jasa lain → minta follow up langkah berikutnya
 * Prodi disimpan di perangkat (localStorage) supaya tidak perlu diketik ulang.
 */
export function KonfirmasiWhatsApp({
  jenis,
  nama: namaAwal,
  produk,
  kode,
}: {
  jenis: "kirim" | "layanan";
  nama: string;
  produk: string[];
  kode: string;
}) {
  const [nama, setNama] = useState(namaAwal === "Customer" ? "" : namaAwal);
  const [prodi, setProdi] = useState("");

  useEffect(() => {
    try {
      setProdi(localStorage.getItem(KUNCI_PRODI) ?? "");
    } catch {
      /* penyimpanan tidak tersedia */
    }
  }, []);

  const daftarProduk = produk.length ? produk.join(", ") : "layanan";
  const siapa = `${nama.trim() || "..."}${prodi.trim() ? `, dari prodi ${prodi.trim()}` : ""}`;
  const pesan =
    jenis === "kirim"
      ? `Halo min, saya ${siapa}, sudah melakukan pembelian produk ${daftarProduk} (No. Receipt ${kode}). ` +
        `Tolong dikonfirmasi pengirimannya dan dikabari nomor resinya ya min! Terima kasih.`
      : `Halo min, saya ${siapa}, sudah melakukan pembelian produk ${daftarProduk} (No. Receipt ${kode}). ` +
        `Tolong di-follow up untuk langkah berikutnya min! Terima kasih.`;
  const href = `https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent(pesan)}`;

  function simpanProdi() {
    try {
      if (prodi.trim()) localStorage.setItem(KUNCI_PRODI, prodi.trim());
    } catch {
      /* abaikan */
    }
  }

  const Ikon = jenis === "kirim" ? Truck : MessageCircle;

  return (
    <section className="overflow-hidden rounded-2xl border-2 border-green-500 bg-white shadow-sm print:hidden">
      <div className="flex items-start gap-3 bg-green-50 px-4 py-3 sm:px-5">
        <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
          <Ikon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="font-extrabold text-green-900">
            {jenis === "kirim" ? "Langkah berikutnya: konfirmasi pengiriman" : "Langkah berikutnya: konfirmasi ke admin"}
          </p>
          <p className="text-sm text-green-800">
            {jenis === "kirim"
              ? "Kirim pesan ke admin agar pesananmu segera dikemas dan kamu dikabari nomor resinya."
              : "Kirim pesan ke admin agar pesananmu segera ditindaklanjuti (jadwal, akses, atau langkah berikutnya)."}
          </p>
        </div>
      </div>

      <div className="space-y-3 p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-semibold text-slate-700">Nama</span>
            <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama lengkap"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-green-600 focus:outline-none" />
          </label>
          <label className="block text-sm">
            <span className="font-semibold text-slate-700">Prodi / kampus</span>
            <input value={prodi} onChange={(e) => setProdi(e.target.value)} onBlur={simpanProdi} placeholder="mis. S1 Manajemen UNS"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-green-600 focus:outline-none" />
          </label>
        </div>

        <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
          <span className="font-semibold text-slate-700">Pesan: </span>
          {pesan}
        </p>

        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={simpanProdi}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3.5 text-base font-bold text-white shadow-sm transition-opacity hover:opacity-90"
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
          Konfirmasi via WhatsApp
        </a>
      </div>
    </section>
  );
}
