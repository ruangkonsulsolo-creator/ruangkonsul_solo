import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BRAND } from "@/lib/brand";
import { UserRoleControl } from "@/components/admin/UserRoleControl";
import { requirePageRole } from "@/lib/auth/page-guard";
import type { Metadata } from "next";
export const metadata: Metadata = { title: `Manajemen User | Admin ${BRAND.name}` };

export default async function AdminUsersPage({ searchParams }: { searchParams: { page?: string; role?: string; q?: string } }) {
  const me = await requirePageRole(["admin", "superadmin"]);
  const isSuperadmin = me.role === "superadmin";
  const supabase = createClient();
  const pageSize = 20;
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  let query = supabase
    .from("profiles")
    .select("id, full_name, whatsapp, referral_code, role, is_active, created_at, credit_balance", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (searchParams.role && ["user", "mentor", "admin", "superadmin"].includes(searchParams.role)) {
    query = query.eq("role", searchParams.role);
  }
  if (searchParams.q) query = query.ilike("full_name", `%${searchParams.q.replace(/[%_,()]/g, "")}%`);
  const { data: users, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / pageSize);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-slate-900">Manajemen User</h2>
        <span className="text-sm text-muted-foreground">{count ?? 0} pengguna</span>
      </div>
      <form className="flex flex-wrap gap-2" action="/admin/users">
        <input name="q" defaultValue={searchParams.q ?? ""} placeholder="Cari nama…" className="rounded-md border border-slate-200 px-3 py-1.5 text-sm" />
        <select name="role" defaultValue={searchParams.role ?? ""} className="rounded-md border border-slate-200 px-2 py-1.5 text-sm">
          <option value="">Semua role</option>
          <option value="user">User</option><option value="mentor">Mentor</option>
          <option value="admin">Admin</option><option value="superadmin">Superadmin</option>
        </select>
        <button className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white">Filter</button>
        {!isSuperadmin && <span className="self-center text-xs text-muted-foreground">Hanya superadmin yang dapat mengubah role.</span>}
      </form>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Nama</th><th className="px-4 py-3">WhatsApp</th><th className="px-4 py-3">Kode Referral</th><th className="px-4 py-3">Kredit</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Daftar</th>{isSuperadmin && <th className="px-4 py-3">Kelola</th>}
            </tr></thead>
            <tbody className="divide-y">
              {(users ?? []).map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{u.full_name ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{u.whatsapp ?? "-"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{u.referral_code}</td>
                  <td className="px-4 py-3 text-xs">{u.credit_balance > 0 ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(u.credit_balance) : "-"}</td>
                  <td className="px-4 py-3"><Badge variant={u.role === "superadmin" ? "default" : u.role === "admin" ? "info" : "secondary"}>{u.role}</Badge></td>
                  <td className="px-4 py-3"><Badge variant={u.is_active ? "success" : "destructive"}>{u.is_active ? "Aktif" : "Nonaktif"}</Badge></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</td>
                  {isSuperadmin && (
                    <td className="px-4 py-3"><UserRoleControl userId={u.id} role={u.role} isActive={u.is_active} isSelf={u.id === me.userId} /></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-xs text-muted-foreground">Halaman {page} dari {totalPages}</p>
            <div className="flex gap-2">
              {page > 1 && <a href={`/admin/users?page=${page - 1}&role=${searchParams.role ?? ""}&q=${encodeURIComponent(searchParams.q ?? "")}`} className="rounded-md border px-3 py-1 text-xs hover:bg-slate-50">← Sebelumnya</a>}
              {page < totalPages && <a href={`/admin/users?page=${page + 1}&role=${searchParams.role ?? ""}&q=${encodeURIComponent(searchParams.q ?? "")}`} className="rounded-md border px-3 py-1 text-xs hover:bg-slate-50">Berikutnya →</a>}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
