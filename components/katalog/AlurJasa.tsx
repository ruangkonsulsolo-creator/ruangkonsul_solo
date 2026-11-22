import { CreditCard, FileCheck2, ListChecks, MessageCircle } from "lucide-react";
import { ESTIMASI_BAWAAN } from "@/lib/katalog/tipe";

/** Empat langkah pemesanan jasa berkas: pilih → bayar → diproses → unduh. */
export function AlurJasa({ estimasi, ringkas = false }: { estimasi?: string | null; ringkas?: boolean }) {
  const langkah = [
    { ikon: ListChecks, judul: "Pilih jasa", isi: "Baca keterangan & pilih paket yang sesuai." },
    { ikon: CreditCard, judul: "Bayar QRIS", isi: "Semua m-banking & e-wallet, terkonfirmasi otomatis." },
    { ikon: MessageCircle, judul: `Diproses maks ${estimasi || ESTIMASI_BAWAAN}`, isi: "Kirim naskah & detail, admin siap dihubungi via WA." },
    { ikon: FileCheck2, judul: "Unduh hasil", isi: "File hasil muncul di halaman pesananmu." },
  ];
  return (
    <ol className={`grid gap-2 ${ringkas ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-4"}`}>
      {langkah.map((l, i) => (
        <li key={l.judul} className="flex gap-2.5 rounded-xl border border-brand-100 bg-white p-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-extrabold text-white">
            {i + 1}
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1 text-sm font-bold text-slate-900">
              <l.ikon className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
              {l.judul}
            </span>
            {!ringkas && <span className="mt-0.5 block text-xs leading-snug text-slate-500">{l.isi}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}
