"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clock, User } from "lucide-react";

/**
 * Jadwal mentor dalam bentuk kalender bulanan.
 *
 * Daftar memanjang memaksa mentor membaca satu per satu untuk tahu hari mana
 * yang padat dan mana yang kosong. Kalender menjawab pertanyaan itu dalam
 * sekali lihat, dan itu pertanyaan yang paling sering diajukan sebelum
 * menyetujui booking baru.
 *
 * Semua tanggal diperlakukan dalam WIB. Tanpa itu, sesi pukul 20.00 bisa
 * jatuh ke kotak hari berikutnya bagi mentor yang peramban­nya menyetel zona
 * waktu lain.
 */

export type SesiJadwal = {
  id: string;
  mulai: string;      // ISO
  selesai: string;    // ISO
  namaKlien: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  catatan?: string | null;
};

const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const WARNA: Record<SesiJadwal["status"], string> = {
  pending: "bg-amber-100 text-amber-900 border-amber-300",
  confirmed: "bg-brand-50 text-brand border-brand-200",
  completed: "bg-slate-100 text-slate-600 border-slate-300",
  cancelled: "bg-red-50 text-red-700 border-red-200 line-through",
};

const LABEL: Record<SesiJadwal["status"], string> = {
  pending: "Menunggu",
  confirmed: "Terkonfirmasi",
  completed: "Selesai",
  cancelled: "Batal",
};

/** Kunci tanggal YYYY-MM-DD menurut WIB, bukan zona waktu peramban. */
function kunciWib(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(iso));
}

function jamWib(iso: string): string {
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta",
  });
}

export function KalenderJadwal({ sesi }: { sesi: SesiJadwal[] }) {
  const kini = new Date();
  const [tahun, setTahun] = useState(kini.getFullYear());
  const [bulan, setBulan] = useState(kini.getMonth());
  const [dipilih, setDipilih] = useState<string | null>(
    kunciWib(kini.toISOString())
  );

  const perHari = useMemo(() => {
    const m = new Map<string, SesiJadwal[]>();
    for (const s of sesi) {
      const k = kunciWib(s.mulai);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(s);
    }
    for (const v of m.values()) {
      v.sort((a, b) => a.mulai.localeCompare(b.mulai));
    }
    return m;
  }, [sesi]);

  const kotak = useMemo(() => {
    const pertama = new Date(tahun, bulan, 1);
    const jumlahHari = new Date(tahun, bulan + 1, 0).getDate();
    const geser = pertama.getDay();
    const hasil: (number | null)[] = Array(geser).fill(null);
    for (let d = 1; d <= jumlahHari; d++) hasil.push(d);
    while (hasil.length % 7 !== 0) hasil.push(null);
    return hasil;
  }, [tahun, bulan]);

  function kunciDari(hari: number): string {
    return `${tahun}-${String(bulan + 1).padStart(2, "0")}-${String(hari).padStart(2, "0")}`;
  }

  function geserBulan(arah: number) {
    const b = bulan + arah;
    if (b < 0) { setBulan(11); setTahun(tahun - 1); }
    else if (b > 11) { setBulan(0); setTahun(tahun + 1); }
    else setBulan(b);
  }

  const hariIni = kunciWib(kini.toISOString());
  const sesiDipilih = dipilih ? perHari.get(dipilih) ?? [] : [];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      {/* ── Kalender ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900">
            {BULAN[bulan]} {tahun}
          </h3>
          <div className="flex gap-1">
            <button type="button" onClick={() => geserBulan(-1)}
              aria-label="Bulan sebelumnya"
              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:border-brand hover:text-brand">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button type="button"
              onClick={() => { setTahun(kini.getFullYear()); setBulan(kini.getMonth()); setDipilih(hariIni); }}
              className="rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-600 hover:border-brand hover:text-brand">
              Hari ini
            </button>
            <button type="button" onClick={() => geserBulan(1)}
              aria-label="Bulan berikutnya"
              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:border-brand hover:text-brand">
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {HARI.map((h) => (
            <div key={h} className="pb-1 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
              {h}
            </div>
          ))}

          {kotak.map((hari, i) => {
            if (hari === null) return <div key={i} />;
            const k = kunciDari(hari);
            const isi = perHari.get(k) ?? [];
            const ini = k === hariIni;
            const aktif = k === dipilih;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setDipilih(k)}
                aria-current={ini ? "date" : undefined}
                aria-label={`${hari} ${BULAN[bulan]}, ${isi.length} sesi`}
                className={`flex min-h-[4.5rem] flex-col rounded-lg border p-1.5 text-left transition-colors ${
                  aktif
                    ? "border-brand bg-brand-50"
                    : ini
                      ? "border-brand-200 bg-white"
                      : "border-slate-100 bg-white hover:border-slate-300"
                }`}
              >
                <span className={`text-xs font-bold ${ini ? "text-brand" : "text-slate-700"}`}>
                  {hari}
                </span>
                <span className="mt-0.5 space-y-0.5">
                  {isi.slice(0, 2).map((s) => (
                    <span key={s.id}
                      className={`block truncate rounded border px-1 py-0.5 text-[9px] font-semibold ${WARNA[s.status]}`}>
                      {jamWib(s.mulai)} {s.namaKlien.split(" ")[0]}
                    </span>
                  ))}
                  {isi.length > 2 && (
                    <span className="block text-[9px] font-bold text-slate-400">
                      +{isi.length - 2} lagi
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-3">
          {(Object.keys(LABEL) as SesiJadwal["status"][]).map((s) => (
            <span key={s} className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
              <span className={`h-2.5 w-2.5 rounded-sm border ${WARNA[s]}`} />
              {LABEL[s]}
            </span>
          ))}
        </div>
      </div>

      {/* ── Rincian hari terpilih ── */}
      <aside className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 font-extrabold text-slate-900">
          {dipilih
            ? new Date(`${dipilih}T00:00:00`).toLocaleDateString("id-ID", {
                weekday: "long", day: "numeric", month: "long",
              })
            : "Pilih tanggal"}
        </h3>

        {sesiDipilih.length === 0 ? (
          <p className="py-6 text-center text-xs leading-relaxed text-slate-500">
            Tidak ada sesi pada tanggal ini.
          </p>
        ) : (
          <ul className="space-y-2">
            {sesiDipilih.map((s) => (
              <li key={s.id} className={`rounded-xl border p-3 ${WARNA[s.status]}`}>
                <p className="flex items-center gap-1.5 text-xs font-bold">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  {jamWib(s.mulai)} – {jamWib(s.selesai)} WIB
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-bold">
                  <User className="h-3.5 w-3.5" aria-hidden="true" />
                  {s.namaKlien}
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide opacity-70">
                  {LABEL[s.status]}
                </p>
                {s.catatan && <p className="mt-1 text-xs opacity-80">{s.catatan}</p>}
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
