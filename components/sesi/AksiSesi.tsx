"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/** Aksi untuk satu sesi bimbingan — dipakai panel admin & panel mentor. */
export function AksiSesi({
  id,
  status,
  meetingLink,
  bolehBatal = false,
}: {
  id: string;
  status: string;
  meetingLink: string | null;
  bolehBatal?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState(meetingLink ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function aksi(body: Record<string, unknown>, pesanOk?: string) {
    setBusy(true);
    setErr(null);
    setOk(null);
    const res = await fetch(`/api/sesi/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(j.error ?? "Gagal.");
    if (pesanOk) setOk(pesanOk);
    router.refresh();
  }

  const btn = "rounded-md px-2.5 py-1 text-xs font-semibold disabled:opacity-40";
  if (status !== "confirmed" && !(bolehBatal && status === "pending")) return null;

  return (
    <div className="flex flex-col items-end gap-1.5">
      {status === "confirmed" && (
        <div className="flex w-full max-w-xs gap-1.5">
          <input
            className="min-w-0 flex-1 rounded-md border border-slate-200 px-2 py-1 text-xs"
            placeholder="https://meet.google.com/…"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            aria-label="Link meeting"
          />
          <button
            disabled={busy || !link.startsWith("https://") || link === meetingLink}
            onClick={() => aksi({ aksi: "link", meeting_link: link }, "Link terkirim ke customer.")}
            className={`${btn} bg-slate-900 text-white`}
          >
            {meetingLink ? "Ubah link" : "Kirim link"}
          </button>
        </div>
      )}
      <div className="flex flex-wrap justify-end gap-1.5">
        {status === "confirmed" && (
          <>
            <button
              disabled={busy}
              onClick={() => {
                const c = prompt("Catatan sesi untuk arsip (opsional):") ?? undefined;
                aksi({ aksi: "selesai", ...(c ? { catatan_sesi: c } : {}) });
              }}
              className={`${btn} bg-green-600 text-white`}
            >
              Selesai
            </button>
            <button
              disabled={busy}
              onClick={() => confirm("Tandai customer tidak hadir?") && aksi({ aksi: "tidak_hadir" })}
              className={`${btn} border border-slate-200 text-slate-600`}
            >
              Tidak hadir
            </button>
          </>
        )}
        {bolehBatal && (
          <button
            disabled={busy}
            onClick={() => {
              const a = prompt("Alasan pembatalan (jika sudah dibayar → refund/reschedule manual):");
              if (a) aksi({ aksi: "batal", alasan: a });
            }}
            className={`${btn} border border-red-200 text-red-600`}
          >
            Batal
          </button>
        )}
        {busy && <Loader2 className="h-4 w-4 animate-spin text-slate-400" aria-hidden="true" />}
      </div>
      {err && <p className="text-xs text-red-600" role="alert">{err}</p>}
      {ok && <p className="text-xs text-green-700">{ok}</p>}
    </div>
  );
}
