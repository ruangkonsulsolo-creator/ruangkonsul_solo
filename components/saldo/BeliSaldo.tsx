"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Star, Wallet } from "lucide-react";
import { formatRupiah } from "@/lib/utils/format-currency";
import { useSnapCheckout } from "@/lib/payment/use-snap";

type Paket = { id: string; nama: string; harga_idr: number; saldo_idr: number; is_populer: boolean };

/** Kartu paket isi saldo → bayar QRIS → saldo bertambah setelah lunas. */
export function BeliSaldo({ paket }: { paket: Paket[] }) {
  const router = useRouter();
  const { pay, busy } = useSnapCheckout();
  const [aktif, setAktif] = useState<string | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function beli(p: Paket) {
    setAktif(p.id);
    setGalat(null);
    setInfo(null);
    try {
      const res = await fetch("/api/payment/saldo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paket_id: p.id }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.push("/login?next=/dashboard/isi-saldo");
        return;
      }
      if (!res.ok || !j.data?.snap_token) {
        setGalat(j.error ?? "Gagal memulai pembayaran.");
        return;
      }
      const { outcome, status } = await pay(j.data.snap_token, j.data.payment_id);
      if (status === "paid") {
        setInfo(`Pembayaran diterima — saldo bertambah ${formatRupiah(p.saldo_idr)}.`);
        router.refresh();
      } else if (outcome === "closed") {
        setInfo("Pembayaran belum selesai. Klik paketnya lagi untuk melanjutkan.");
      } else {
        setInfo("Menunggu konfirmasi pembayaran… saldo akan bertambah otomatis.");
        setTimeout(() => router.refresh(), 4000);
      }
    } catch {
      setGalat("Koneksi gagal. Coba lagi.");
    } finally {
      setAktif(null);
    }
  }

  if (paket.length === 0) {
    return <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500">Paket isi saldo belum tersedia.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        {paket.map((p) => {
          const bonus = p.saldo_idr - p.harga_idr;
          return (
            <button
              key={p.id}
              type="button"
              disabled={busy || aktif !== null}
              onClick={() => beli(p)}
              className={`relative flex flex-col items-start gap-1 rounded-2xl border bg-white p-5 text-left transition-colors hover:border-brand hover:bg-brand-50 disabled:opacity-60 ${
                p.is_populer ? "border-brand ring-1 ring-brand" : "border-slate-200"
              }`}
            >
              {p.is_populer && (
                <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">
                  <Star className="h-3 w-3" aria-hidden="true" /> Populer
                </span>
              )}
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{p.nama}</span>
              <span className="text-2xl font-extrabold text-slate-900">{formatRupiah(p.saldo_idr)}</span>
              <span className="text-xs text-slate-500">saldo cek naskah</span>
              {bonus > 0 && <span className="text-xs font-bold text-green-700">Bonus {formatRupiah(bonus)}</span>}
              <span className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-3 py-2 text-sm font-bold text-white">
                {aktif === p.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Wallet className="h-4 w-4" aria-hidden="true" />}
                Bayar {formatRupiah(p.harga_idr)}
              </span>
            </button>
          );
        })}
      </div>
      {galat && <p role="alert" className="text-sm text-red-600">{galat}</p>}
      {info && <p className="text-sm text-slate-700">{info}</p>}
      <p className="text-xs text-slate-500">Pembayaran QRIS (semua m-banking &amp; e-wallet) diproses aman oleh Midtrans. Saldo tidak dapat diuangkan kembali.</p>
    </div>
  );
}
