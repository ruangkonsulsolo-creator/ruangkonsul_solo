"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type MentorFoto = { user_id: string; nama: string; avatar_url: string | null };

/** Admin mengunggah / mengganti foto mentor (mis. mentor belum sempat unggah sendiri). */
export function FotoMentorAdmin({ awal }: { awal: MentorFoto[] }) {
  const [rows, setRows] = useState(awal);
  const [busy, setBusy] = useState<string | null>(null);
  const [pesan, setPesan] = useState<{ teks: string; ok: boolean } | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const [target, setTarget] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !target) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(f.type)) return setPesan({ teks: "Format harus JPG, PNG, WebP, atau AVIF.", ok: false });
    if (f.size > 5 * 1024 * 1024) return setPesan({ teks: "Ukuran foto maksimal 5 MB.", ok: false });
    setBusy(target);
    try {
      const supabase = createClient();
      const ext = f.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `mentor/admin/${target}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("public-assets").upload(path, f, { contentType: f.type });
      if (error) throw new Error(error.message);
      const url = supabase.storage.from("public-assets").getPublicUrl(path).data.publicUrl;
      const res = await fetch("/api/admin/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: target, aksi: "foto", avatar_url: url }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Gagal menyimpan foto.");
      setRows((r) => r.map((m) => (m.user_id === target ? { ...m, avatar_url: url } : m)));
      setPesan({ teks: "Foto mentor diperbarui.", ok: true });
    } catch (err) {
      setPesan({ teks: err instanceof Error ? err.message : "Gagal mengunggah.", ok: false });
    } finally {
      setBusy(null);
      setTarget(null);
    }
  }

  const tanpaFoto = rows.filter((m) => !m.avatar_url).length;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-extrabold text-slate-900">Foto Mentor</h2>
        <p className={`text-xs font-semibold ${tanpaFoto ? "text-red-600" : "text-green-700"}`}>
          {tanpaFoto ? `${tanpaFoto} mentor belum punya foto` : "Semua mentor sudah punya foto"}
        </p>
      </div>
      {pesan && (
        <p className={`mb-3 rounded-lg px-3 py-2 text-sm ${pesan.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>{pesan.teks}</p>
      )}
      <input ref={file} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={onFile} />
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        {rows.map((m) => (
          <li key={m.user_id} className="text-center">
            <div className={`relative mx-auto aspect-[4/5] w-full overflow-hidden rounded-xl border ${m.avatar_url ? "" : "border-red-200 bg-red-50"}`}>
              {m.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.avatar_url} alt={m.nama} className="h-full w-full object-cover object-top" />
              ) : (
                <UserRound className="absolute bottom-0 left-1/2 h-3/4 w-3/4 -translate-x-1/2 text-red-200" strokeWidth={1} />
              )}
            </div>
            <p className="mt-1.5 truncate text-xs font-semibold text-slate-800">{m.nama}</p>
            <button type="button" disabled={busy === m.user_id}
              onClick={() => { setTarget(m.user_id); setTimeout(() => file.current?.click(), 0); }}
              className="mt-1 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-brand hover:text-brand disabled:opacity-60">
              {busy === m.user_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
              {m.avatar_url ? "Ganti" : "Unggah"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
