import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { BRAND } from "@/lib/brand";
import { PREVIEW_MODE, PREVIEW_USER } from "@/lib/utils/preview-mode";
import type { Metadata } from "next";
export const metadata: Metadata = { title: `Daftar Klien | ${BRAND.name}` };

export default async function KlienMentorPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { if (!PREVIEW_MODE) redirect("/login"); }

  const { data: mentorProfile } = await supabase
    .from("mentor_profiles").select("id").eq("user_id", user?.id ?? PREVIEW_USER.id).single();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, booking_number, status, topic, created_at, profiles(full_name, whatsapp), booking_slots(slot_date, slot_start)")
    .eq("mentor_id", mentorProfile?.id ?? "")
    .order("created_at", { ascending: false });

  const STATUS_MAP: Record<string, { label: string; variant: "success"|"warning"|"info"|"destructive"|"muted" }> = {
    pending:   { label: "Menunggu",     variant: "warning" },
    confirmed: { label: "Dikonfirmasi", variant: "success" },
    completed: { label: "Selesai",      variant: "info" },
    cancelled: { label: "Dibatalkan",   variant: "destructive" },
    no_show:   { label: "Tidak Hadir",  variant: "muted" },
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Daftar Klien</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Semua klien yang pernah booking bimbingan denganmu.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Klien</th>
              <th className="px-4 py-3">Jadwal</th>
              <th className="px-4 py-3">Topik</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Aksi</th>
            </tr></thead>
            <tbody className="divide-y">
              {(bookings ?? []).length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Belum ada klien.</td></tr>
              ) : (bookings ?? []).map((b) => {
                const cust = b.profiles as any;
                const slot = b.booking_slots as any;
                const st = STATUS_MAP[b.status] ?? { label: b.status, variant: "muted" as const };
                return (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{cust?.full_name ?? "-"}</p>
                      <p className="text-xs text-muted-foreground">{cust?.whatsapp ?? ""}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {slot?.slot_date ? new Date(slot.slot_date + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                      {slot?.slot_start && ` · ${slot.slot_start.slice(0,5)} WIB`}
                    </td>
                    <td className="px-4 py-3 max-w-[180px] truncate text-slate-600">{b.topic ?? "-"}</td>
                    <td className="px-4 py-3"><Badge variant={st.variant}>{st.label}</Badge></td>
                    <td className="px-4 py-3">
                      {cust?.whatsapp && (
                        <a href={`https://wa.me/${cust.whatsapp}`} target="_blank" rel="noopener noreferrer"
                          className="text-xs font-semibold text-[#8B0000] hover:underline">Chat WA</a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
