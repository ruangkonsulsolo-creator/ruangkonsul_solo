import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatRupiah } from "@/lib/utils/format-currency";
import { BeliSaldo } from "@/components/saldo/BeliSaldo";
import { ambilTarifPeriksa } from "@/lib/periksa/tarif";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Isi Saldo | ${BRAND.name}` };

const tgl = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

export default async function IsiSaldoPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/isi-saldo");

  const admin = createAdminClient();
  const [{ data: profil }, { data: paket }, { data: mutasi }, { tarif }] = await Promise.all([
    admin.from("profiles").select("credit_balance").eq("id", user.id).single(),
    supabase.from("paket_saldo").select("id, nama, harga_idr, saldo_idr, is_populer").eq("is_active", true).order("urutan"),
    admin.from("mutasi_kredit").select("id, jumlah, saldo_akhir, keterangan, dibuat_pada").eq("user_id", user.id).order("dibuat_pada", { ascending: false }).limit(20),
    ambilTarifPeriksa(),
  ]);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Isi Saldo Cek Naskah</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Saldo dipakai untuk Cek Plagiarisme ({formatRupiah(tarif.kemiripan)}), Cek AI ({formatRupiah(tarif.ai)}) dan Parafrase ({formatRupiah(tarif.parafrase)}) per 1.000 kata.
          </p>
        </div>
        <div className="rounded-2xl border border-brand-200 bg-brand-50 px-5 py-3 text-right">
          <p className="flex items-center justify-end gap-1.5 text-xs font-bold uppercase tracking-wider text-brand"><Wallet className="h-3.5 w-3.5" aria-hidden="true" /> Saldo sekarang</p>
          <p className="text-2xl font-extrabold text-slate-900">{formatRupiah(profil?.credit_balance ?? 0)}</p>
        </div>
      </div>

      <BeliSaldo paket={paket ?? []} />

      <div className="flex justify-end">
        <Link href="/cek-plagiarisme" className="text-sm font-semibold text-brand hover:underline">Mulai cek naskah →</Link>
      </div>

      <section>
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-500">Riwayat saldo</h3>
        {(mutasi ?? []).length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500">Belum ada mutasi saldo.</p>
        ) : (
          <div className="divide-y rounded-2xl border border-slate-200 bg-white">
            {(mutasi ?? []).map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <div>
                  <p className="text-slate-800">{m.keterangan}</p>
                  <p className="text-xs text-slate-500">{tgl.format(new Date(m.dibuat_pada))}</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${m.jumlah >= 0 ? "text-green-700" : "text-slate-900"}`}>{m.jumlah >= 0 ? "+" : "−"}{formatRupiah(Math.abs(m.jumlah))}</p>
                  <p className="text-xs text-slate-500">Saldo {formatRupiah(m.saldo_akhir)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
