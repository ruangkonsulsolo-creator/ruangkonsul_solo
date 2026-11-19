"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/brand";

/** Halaman set password baru (dibuka dari link email "lupa password" setelah /auth/callback). */
export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [ready, setReady] = useState<"checking" | "ok" | "invalid">("checking");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "error" | "ok"; text: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setReady(data.user ? "ok" : "invalid"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return setMsg({ type: "error", text: "Minimal 8 karakter, mengandung huruf dan angka." });
    if (pw !== pw2) return setMsg({ type: "error", text: "Konfirmasi password tidak sama." });
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setMsg({ type: "error", text: error.message.includes("different") ? "Password baru harus berbeda dari yang lama." : "Gagal menyimpan password." });
    setMsg({ type: "ok", text: "Password berhasil diubah. Mengalihkan…" });
    setTimeout(() => router.push("/dashboard"), 1200);
  }

  const input = "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm";
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <Lock className="h-5 w-5 text-[#8B0000]" aria-hidden="true" />
          <h1 className="text-lg font-extrabold text-slate-900">Atur Password Baru</h1>
        </div>
        {ready === "checking" && <Loader2 className="mx-auto h-5 w-5 animate-spin text-slate-400" />}
        {ready === "invalid" && (
          <p className="text-sm text-slate-600">
            Link reset tidak valid atau sudah kedaluwarsa.{" "}
            <Link href="/lupa-password" className="font-semibold text-[#8B0000] hover:underline">Minta link baru</Link>
          </p>
        )}
        {ready === "ok" && (
          <form onSubmit={submit} className="space-y-3">
            <input type="password" autoComplete="new-password" className={input} placeholder="Password baru" value={pw} onChange={(e) => setPw(e.target.value)} required />
            <input type="password" autoComplete="new-password" className={input} placeholder="Ulangi password baru" value={pw2} onChange={(e) => setPw2(e.target.value)} required />
            {msg && <p className={`text-xs ${msg.type === "error" ? "text-red-600" : "text-green-700"}`}>{msg.text}</p>}
            <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#8B0000] py-2.5 text-sm font-bold text-white disabled:opacity-60">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Simpan Password
            </button>
          </form>
        )}
        <p className="mt-6 text-center text-xs text-slate-400">{BRAND.name}</p>
      </div>
    </main>
  );
}
