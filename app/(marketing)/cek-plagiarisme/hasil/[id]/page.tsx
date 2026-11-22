import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { NavbarUtama } from "@/components/ui/NavbarUtama";
import { HasilInstan } from "@/components/periksa/KotakPeriksa";
import { createClient } from "@/lib/supabase/server";
import { getUserTermasukTamu } from "@/lib/supabase/tamu";
import type { HasilPeriksa } from "@/lib/periksa/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Hasil Cek Naskah", robots: { index: false } };

/**
 * Hasil Cek AI / Parafrase yang dibuka dari Riwayat Pesanan — tampilan sama
 * dengan setelah bayar: skor + unduh laporan asli penyedia (ZeroGPT) / Word.
 * Pemilik saja (akun atau sesi tamu); RLS tabel pemeriksaan yang menyaring.
 */
export default async function HasilCekPage({ params }: { params: { id: string } }) {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();
  const supabase = createClient({ tamu: true });
  const user = await getUserTermasukTamu(supabase);
  if (!user) redirect("/cek-plagiarisme?tab=riwayat");

  const { data: r } = await supabase
    .from("pemeriksaan")
    .select("id, status, cuplikan, hasil")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!r || r.status !== "selesai" || !r.hasil) notFound();

  const hasil = r.hasil as HasilPeriksa;
  const cuplikan = ((r.cuplikan as string | null) ?? "").trim();
  const nama = cuplikan ? `${cuplikan.slice(0, 60)}${cuplikan.length > 60 ? "…" : ""}` : "Naskah";

  return (
    <div className="min-h-screen bg-slate-50">
      <NavbarUtama />
      <main className="px-4 pb-16 pt-8">
        <HasilInstan
          hasil={{ ...hasil, id: r.id as string }}
          nama={nama}
          orderBaru="/cek-plagiarisme"
          kembali={{ href: "/cek-plagiarisme?tab=riwayat", label: "Riwayat Pesanan" }}
        />
      </main>
    </div>
  );
}
