import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireUser, STAFF_ROLES } from "@/lib/auth/require-user";
import { daftarSesi } from "@/lib/sesi/daftar";
import { lepasBookingKedaluwarsa } from "@/lib/booking/lepas-kedaluwarsa";
import { TabelSesi } from "@/components/sesi/TabelSesi";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Sesi Bimbingan | Admin ${BRAND.name}` };

const FILTER: Array<[string, string]> = [
  ["confirmed", "Terkonfirmasi"],
  ["menunggu_bayar", "Menunggu Bayar"],
  ["completed", "Selesai"],
  ["no_show", "Tidak Hadir"],
  ["cancelled", "Dibatalkan"],
  ["semua", "Semua"],
];

export default async function AdminSesiPage({ searchParams }: { searchParams: { status?: string } }) {
  // Lapis kedua setelah middleware: data di bawah dibaca dengan service role.
  const auth = await requireUser(STAFF_ROLES);
  if (!auth.ok) redirect("/login?next=/admin/sesi");

  const status = FILTER.some(([k]) => k === searchParams.status) ? searchParams.status! : "confirmed";
  await lepasBookingKedaluwarsa();
  const rows = await daftarSesi({ status });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Sesi Bimbingan</h2>
        <p className="text-sm text-slate-500">
          Sesi harian yang dipesan customer lewat Jadwal. Kirim link meeting setelah sesi lunas — customer dikabari otomatis.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {FILTER.map(([k, label]) => (
          <a key={k} href={`?status=${k}`} className={`rounded-full border px-3 py-1 ${status === k ? "bg-slate-900 text-white" : "bg-white"}`}>
            {label}
          </a>
        ))}
      </div>
      <TabelSesi rows={rows} tampilMentor bolehBatal />
    </div>
  );
}
