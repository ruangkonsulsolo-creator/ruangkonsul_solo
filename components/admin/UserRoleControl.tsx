"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Toast, useToast } from "@/components/ui/toast";

const ROLES = [
  { value: "user", label: "User" },
  { value: "mentor", label: "Mentor" },
  { value: "admin", label: "Admin" },
  { value: "superadmin", label: "Superadmin" },
];

/** Hanya dirender untuk superadmin. */
export function UserRoleControl({
  userId, role, isActive, isSelf,
}: { userId: string; role: string; isActive: boolean; isSelf: boolean }) {
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const [busy, setBusy] = useState(false);

  async function update(body: Record<string, unknown>, okMsg: string) {
    setBusy(true);
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return showToast(json.error ?? "Gagal memperbarui.", "error");
    showToast(okMsg, "success");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={role}
        disabled={busy || isSelf}
        onChange={(e) => {
          const next = e.target.value;
          if (next === role) return;
          if (!confirm(`Ubah role menjadi "${next}"?`)) { e.target.value = role; return; }
          update({ role: next }, `Role diubah ke ${next}.`);
        }}
        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs disabled:opacity-60"
        aria-label="Ubah role"
      >
        {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
      </select>
      <button
        type="button"
        disabled={busy || isSelf}
        onClick={() => {
          if (!confirm(isActive ? "Nonaktifkan akun ini? User tidak akan bisa login." : "Aktifkan kembali akun ini?")) return;
          update({ is_active: !isActive }, isActive ? "Akun dinonaktifkan." : "Akun diaktifkan.");
        }}
        className={`rounded-md px-2 py-1 text-xs font-semibold disabled:opacity-60 ${isActive ? "border border-red-200 text-red-600 hover:bg-red-50" : "border border-green-200 text-green-700 hover:bg-green-50"}`}
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : isActive ? "Nonaktifkan" : "Aktifkan"}
      </button>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
}
