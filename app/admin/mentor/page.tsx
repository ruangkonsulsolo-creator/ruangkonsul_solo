import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  MentorPerformaTable,
  type Performa,
  type CalonMentor,
} from "@/components/admin/MentorPerformaTable";
import { formatRupiah } from "@/lib/utils/format-currency";
import { FotoMentorAdmin, type MentorFoto } from "@/components/admin/FotoMentorAdmin";

export const metadata: Metadata = { title: "Kinerja Mentor" };
export const dynamic = "force-dynamic";


export default async function AdminMentorPage() {
  const supabase = createClient();

  // Angka kinerja dihitung oleh view mentor_performa di database, bukan di
  // sini. View itu memakai security_invoker sehingga otomatis kosong untuk
  // non-staf, jadi halaman ini tidak perlu mengecek role sendiri.
  const { data: performaData, error: ePerforma } = await supabase
    .from("mentor_performa")
    .select("*")
    .order("sesi_selesai", { ascending: false });

  if (ePerforma) console.error("[admin/mentor] performa:", ePerforma.message);

  // Customer yang bisa diangkat jadi mentor.
  const { data: calonData } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active")
    .eq("role", "user")
    .eq("is_active", true)
    .order("full_name");

  const { data: fotoData } = await supabase
    .from("mentor_profiles")
    .select("user_id, display_name, avatar_url")
    .order("display_name");
  const fotoMentor: MentorFoto[] = (fotoData ?? []).map((m) => ({
    user_id: m.user_id as string,
    nama: (m.display_name as string | null) || "Mentor",
    avatar_url: (m.avatar_url as string | null) || null,
  }));

  const performa = (performaData ?? []) as Performa[];
  const calon = ((calonData ?? []) as Array<{ id: string; full_name: string | null }>)
    .map((c) => ({ id: c.id, full_name: c.full_name, email: null })) as CalonMentor[];

  const total = performa.reduce(
    (a, m) => ({
      mentor: a.mentor + 1,
      aktif: a.aktif + (m.is_available ? 1 : 0),
      sesi: a.sesi + m.sesi_selesai,
      bulanIni: a.bulanIni + m.selesai_bulan_ini,
      pendapatan: a.pendapatan + m.pendapatan_bulan_ini,
      tanpaSlot: a.tanpaSlot + (m.is_available && m.slot_terbuka === 0 ? 1 : 0),
    }),
    { mentor: 0, aktif: 0, sesi: 0, bulanIni: 0, pendapatan: 0, tanpaSlot: 0 }
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold text-slate-900">Kinerja Mentor</h1>
        <p className="mt-1 text-sm text-slate-500">
          Pantau beban, hasil, dan ketersediaan tiap mentor. Angka dihitung dari
          data booking, bukan diisi manual.
        </p>
      </header>

      {/* Ringkasan */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { label: "Mentor aktif", val: `${total.aktif} / ${total.mentor}` },
          { label: "Sesi selesai (total)", val: total.sesi },
          { label: "Sesi selesai bulan ini", val: total.bulanIni },
          { label: "Pendapatan bulan ini", val: formatRupiah(total.pendapatan) },
          {
            label: "Mentor tanpa slot",
            val: total.tanpaSlot,
            waspada: total.tanpaSlot > 0,
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-slate-200 bg-white p-4"
          >
            <p
              className={`text-xl font-extrabold ${
                s.waspada ? "text-red-600" : "text-slate-900"
              }`}
            >
              {s.val}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      {total.tanpaSlot > 0 && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {total.tanpaSlot} mentor aktif tidak punya satu pun slot terbuka, jadi
          tidak akan menerima booking baru. Minta mereka mengatur jadwal, atau
          jalankan pembuatan slot dari pola mingguannya.
        </p>
      )}

      {fotoMentor.length > 0 && <FotoMentorAdmin awal={fotoMentor} />}

      <MentorPerformaTable performa={performa} calon={calon} />
    </div>
  );
}
