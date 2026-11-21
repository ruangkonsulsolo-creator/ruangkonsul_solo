import { Download, Clock, MessageCircle, ArrowRight } from "lucide-react";

const WA_ADMIN = "62882007483223";

/**
 * Kartu skor setelah bayar: label kecil, persentase besar, vonis singkat,
 * satu tombol unduh lebar, lalu tautan "Hubungi Admin".
 *
 * Dipakai untuk hasil Cek AI, laporan Turnitin/DrillBit, dan parafrase,
 * supaya customer selalu melihat bentuk hasil yang sama.
 * Komponen server-safe (tanpa hook) agar bisa dipakai di halaman server.
 */
export function KartuSkor({
  label,
  persen,
  vonis,
  aksi,
  catatan,
  pesanWa,
  menunggu = false,
}: {
  label: string;
  /** null = belum ada angka (mis. laporan masih diperiksa). */
  persen: number | null;
  vonis: string;
  aksi?: { href: string; label: string; unduh?: boolean };
  catatan?: string;
  /** Isi pesan WhatsApp ke admin, mis. menyertakan nomor pesanan. */
  pesanWa?: string;
  menunggu?: boolean;
}) {
  const nada =
    persen == null ? "text-slate-300" : "text-brand";
  return (
    <section className="mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-brand-100 bg-white text-center shadow-card">
      <div className="h-1.5 bg-gradient-to-r from-brand-dark via-brand to-brand-light" aria-hidden="true" />
      <div className="px-6 pb-6 pt-7">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
        {menunggu ? (
          <div className="mx-auto mt-4 flex h-20 w-20 items-center justify-center rounded-full bg-brand-50 text-brand">
            <Clock className="h-9 w-9" aria-hidden="true" />
          </div>
        ) : (
          <p className={`mt-2 text-7xl font-extrabold leading-none tracking-tight ${nada}`}>
            {persen == null ? "—" : `${persen}%`}
          </p>
        )}
        <p className="mt-3 font-semibold text-slate-700">{vonis}</p>

        {aksi && (
          <a
            href={aksi.href}
            {...(aksi.unduh ? { download: "" } : {})}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-dark to-brand px-5 py-3.5 text-base font-bold text-white shadow-brand-sm transition-opacity hover:opacity-90"
          >
            {aksi.unduh ? <Download className="h-5 w-5" aria-hidden="true" /> : null}
            {aksi.label}
            {!aksi.unduh ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
          </a>
        )}
        {catatan && <p className="mt-2.5 text-xs font-medium text-slate-500">{catatan}</p>}

        <a
          href={`https://wa.me/${WA_ADMIN}${pesanWa ? `?text=${encodeURIComponent(pesanWa)}` : ""}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-slate-700 hover:text-brand"
        >
          <MessageCircle className="h-4 w-4 text-green-600" aria-hidden="true" /> Hubungi Admin
        </a>
      </div>
    </section>
  );
}
