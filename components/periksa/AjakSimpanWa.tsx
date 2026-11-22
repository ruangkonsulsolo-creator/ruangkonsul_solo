import { BRAND } from "@/lib/brand";

/**
 * Ajakan menyimpan / menyapa nomor notifikasi. Pesan ke nomor yang pernah
 * chat duluan jauh lebih jarang ditandai spam oleh WhatsApp, jadi notifikasi
 * laporan lebih pasti sampai (dan nomor pengirim lebih aman dari blokir).
 */
export function AjakSimpanWa({ kode, className = "" }: { kode?: string; className?: string }) {
  const teks = `Halo ${BRAND.name}, saya mau terima notifikasi laporan${kode ? ` pesanan ${kode}` : ""}.`;
  return (
    <div className={`rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm ${className}`}>
      <p className="font-bold text-green-900">Supaya notifikasi WhatsApp pasti masuk</p>
      <p className="mt-0.5 text-green-800">
        Simpan nomor <span className="font-bold">{BRAND.whatsappNotifDisplay}</span> sebagai &ldquo;{BRAND.shortName}&rdquo;,
        atau sapa dulu sekali lewat tombol di bawah.
      </p>
      <a
        href={`https://wa.me/${BRAND.whatsappNotif}?text=${encodeURIComponent(teks)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700"
      >
        Sapa nomor notifikasi
      </a>
    </div>
  );
}
