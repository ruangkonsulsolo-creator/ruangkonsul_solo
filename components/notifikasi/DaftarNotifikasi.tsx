import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const waktu = new Intl.DateTimeFormat("id-ID", {
  day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta",
});

/** Ubah URL di dalam isi notifikasi (mis. link meeting) menjadi tautan. */
function Isi({ teks }: { teks: string }) {
  const bagian = teks.split(/(https:\/\/[^\s]+)/g);
  return (
    <>
      {bagian.map((b, i) =>
        b.startsWith("https://") ? (
          <a key={i} href={b} target="_blank" rel="noopener noreferrer" className="break-all font-semibold text-brand hover:underline">{b}</a>
        ) : (
          <span key={i}>{b}</span>
        )
      )}
    </>
  );
}

/**
 * Notifikasi in-app untuk semua role (customer, mentor, admin). Sebelumnya
 * notifikasi hanya dihitung di header lalu ditautkan ke Riwayat Pesanan, jadi
 * isinya tidak pernah bisa dibaca dan tidak pernah ditandai terbaca.
 */
export async function DaftarNotifikasi({ asal }: { asal: string }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(asal)}`);

  const { data: rows } = await supabase
    .from("notifications")
    .select("id, title, body, is_read, sent_at")
    .eq("user_id", user.id)
    .order("sent_at", { ascending: false })
    .limit(100);

  // Tandai terbaca setelah daftar diambil, supaya yang baru tetap disorot di kunjungan ini.
  const belum = (rows ?? []).filter((r) => !r.is_read).map((r) => r.id);
  if (belum.length) await supabase.from("notifications").update({ is_read: true }).in("id", belum);

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Notifikasi</h2>
        <p className="mt-0.5 text-sm text-slate-500">Kabar pembayaran, jadwal sesi, dan saldo.</p>
      </div>
      {(rows ?? []).length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white py-14 text-center">
          <Bell className="h-10 w-10 text-slate-200" aria-hidden="true" />
          <p className="text-sm text-slate-500">Belum ada notifikasi.</p>
          
        </div>
      ) : (
        <ul className="divide-y rounded-2xl border border-slate-200 bg-white">
          {(rows ?? []).map((n) => (
            <li key={n.id} className={`px-5 py-4 ${n.is_read ? "" : "bg-brand-50"}`}>
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-slate-900">
                  {!n.is_read && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-brand align-middle" aria-label="Baru" />}
                  {n.title}
                </p>
                <time className="shrink-0 text-xs text-slate-500">{waktu.format(new Date(n.sent_at))}</time>
              </div>
              {n.body && <p className="mt-1 whitespace-pre-line text-sm text-slate-700"><Isi teks={n.body} /></p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
