import { formatRupiah } from "@/lib/utils/format-currency";
import { formatWhatsApp } from "@/lib/validators/whatsapp";
import { AksiSesi } from "@/components/sesi/AksiSesi";
import { jadwalWib, labelSesi, type SesiRow } from "@/lib/sesi/daftar";

/** Daftar sesi bimbingan: jadwal, klien, request, status, aksi. Server component. */
export function TabelSesi({ rows, tampilMentor, bolehBatal }: { rows: SesiRow[]; tampilMentor: boolean; bolehBatal: boolean }) {
  if (rows.length === 0) {
    return <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500">Tidak ada sesi.</p>;
  }
  return (
    <div className="divide-y rounded-2xl border border-slate-200 bg-white">
      {rows.map((b) => {
        const st = labelSesi(b);
        return (
          <div key={b.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1.1fr_1.3fr_auto]">
            <div>
              <p className="font-semibold text-slate-900">{jadwalWib(b.slot)}</p>
              {tampilMentor && <p className="text-sm text-slate-600">Mentor: {b.mentor?.display_name ?? "-"}</p>}
              <p className="font-mono text-xs text-slate-500">{b.booking_number}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                {b.price_idr > 0 && <span className="text-xs font-bold text-slate-700">{formatRupiah(b.price_idr)}</span>}
              </div>
            </div>
            <div className="text-sm text-slate-700">
              <p className="font-semibold text-slate-900">{b.klien?.full_name || "Klien"}</p>
              {b.whatsapp && (
                <a href={`https://wa.me/${b.whatsapp}`} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-brand hover:underline">
                  WA {formatWhatsApp(b.whatsapp)}
                </a>
              )}
              {b.topic && <p className="mt-1"><span className="text-xs font-bold uppercase text-slate-400">Topik</span><br />{b.topic}</p>}
              {b.notes && <p className="mt-1 whitespace-pre-line rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-900"><span className="font-bold">Request:</span> {b.notes}</p>}
              {b.meeting_link && (
                <a href={b.meeting_link} target="_blank" rel="noopener noreferrer" className="mt-1 block truncate text-xs text-blue-700 hover:underline">{b.meeting_link}</a>
              )}
              {b.status === "cancelled" && b.cancel_reason && <p className="mt-1 text-xs text-red-600">{b.cancel_reason}</p>}
            </div>
            <AksiSesi id={b.id} status={b.status} meetingLink={b.meeting_link} bolehBatal={bolehBatal && ["pending", "confirmed"].includes(b.status)} />
          </div>
        );
      })}
    </div>
  );
}
