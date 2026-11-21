"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, Eye, EyeOff, ImagePlus, Loader2, Plus, Save, Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type Slide = {
  id: string;
  image_url: string;
  alt: string | null;
  badge: string | null;
  hook: string | null;
  cta_label: string | null;
  cta_href: string | null;
  sort_order: number;
  is_active: boolean;
};

type Draf = Omit<Slide, "id"> & { id?: string };

const KOSONG: Draf = {
  image_url: "", alt: "", badge: "", hook: "", cta_label: "", cta_href: "/jadwal", sort_order: 0, is_active: true,
};
const TIPE = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAKS = 5 * 1024 * 1024;

async function simpanKeServer(d: Draf): Promise<{ data?: Slide; error?: string }> {
  const res = await fetch("/api/admin/hero", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: d.id,
      image_url: d.image_url,
      alt: d.alt ?? "",
      badge: d.badge ?? "",
      hook: d.hook ?? "",
      cta_label: d.cta_label ?? "",
      cta_href: d.cta_href ?? "",
      sort_order: d.sort_order,
      is_active: d.is_active,
    }),
  });
  const j = await res.json().catch(() => ({}));
  return res.ok ? { data: j.data } : { error: j.error ?? "Gagal menyimpan." };
}

const INPUT = "w-full rounded-md border border-input px-2.5 py-1.5 text-sm";

function Kolom({ v, on, label, ph, max }: { v: string | null; on: (x: string) => void; label: string; ph?: string; max: number }) {
  return (
    <label className="space-y-1 text-[11px] font-semibold text-slate-500">
      {label}
      <input value={v ?? ""} onChange={(e) => on(e.target.value)} placeholder={ph} maxLength={max} className={`${INPUT} font-normal`} />
    </label>
  );
}

function Formulir({ d, set }: { d: Draf; set: (f: keyof Draf, v: unknown) => void }) {
  return (
    <div className="grid flex-1 gap-2 sm:grid-cols-2">
      <Kolom label="Label kecil (badge)" v={d.badge} on={(x) => set("badge", x)} ph="🎓 Bimbingan Private" max={60} />
      <Kolom label="Judul di gambar" v={d.hook} on={(x) => set("hook", x)} ph="Sampai ACC Sidang!" max={80} />
      <Kolom label="Teks tombol" v={d.cta_label} on={(x) => set("cta_label", x)} ph="Daftar Sekarang" max={40} />
      <Kolom label="Link tombol" v={d.cta_href} on={(x) => set("cta_href", x)} ph="/jadwal atau https://…" max={300} />
      <div className="sm:col-span-2">
        <Kolom label="Deskripsi gambar (untuk aksesibilitas & SEO)" v={d.alt} on={(x) => set("alt", x)} ph="Promo bimbingan skripsi" max={200} />
      </div>
    </div>
  );
}

function Gambar({ url, onGanti, sibuk }: { url: string; onGanti: () => void; sibuk: boolean }) {
  return (
    <div className="w-full shrink-0 sm:w-36">
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl border bg-slate-100">
        {url ? (
          <Image src={url} alt="" fill sizes="144px" className="object-cover object-top" unoptimized={url.startsWith("http")} />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-300"><ImagePlus className="h-8 w-8" /></div>
        )}
      </div>
      <button type="button" onClick={onGanti} disabled={sibuk}
        className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
        {sibuk ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        {url ? "Ganti gambar" : "Unggah gambar"}
      </button>
    </div>
  );
}


/** Hak akses ditegakkan API (wajibStaf) + RLS hero_slides & storage. */
export function KelolaHeroSlide({ awal }: { awal: Slide[] }) {
  const supabase = createClient();
  const [rows, setRows] = useState<Slide[]>(awal);
  const [draf, setDraf] = useState<Draf | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pesan, setPesan] = useState<{ teks: string; ok: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [targetUnggah, setTargetUnggah] = useState<string | "draf" | null>(null);

  const info = (teks: string, ok = true) => setPesan({ teks, ok });

  async function unggah(file: File): Promise<string | null> {
    if (!TIPE.includes(file.type)) { info("Format gambar harus JPG, PNG, WebP, atau AVIF.", false); return null; }
    if (file.size > MAKS) { info("Ukuran gambar maksimal 5 MB.", false); return null; }
    const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `hero/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("public-assets").upload(path, file, { contentType: file.type, upsert: false });
    if (error) { info(`Gagal mengunggah: ${error.message}`, false); return null; }
    return supabase.storage.from("public-assets").getPublicUrl(path).data.publicUrl;
  }

  async function onPilihFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !targetUnggah) return;
    setBusy(`unggah-${targetUnggah}`);
    const url = await unggah(file);
    if (url) {
      if (targetUnggah === "draf") {
        setDraf((d) => (d ? { ...d, image_url: url } : d));
      } else {
        const s = rows.find((r) => r.id === targetUnggah);
        if (s) {
          const res = await simpanKeServer({ ...s, image_url: url });
          if (res.data) { setRows((r) => r.map((x) => (x.id === s.id ? res.data! : x))); info("Gambar banner diganti."); }
          else info(res.error!, false);
        }
      }
    }
    setBusy(null);
    setTargetUnggah(null);
  }

  function pilihGambar(target: string | "draf") {
    setTargetUnggah(target);
    setTimeout(() => fileRef.current?.click(), 0);
  }

  const ubah = (id: string, f: keyof Slide, v: unknown) =>
    setRows((r) => r.map((x) => (x.id === id ? { ...x, [f]: v } : x)));

  async function simpan(s: Draf) {
    setBusy(s.id ?? "draf");
    const res = await simpanKeServer(s);
    setBusy(null);
    if (!res.data) return info(res.error!, false);
    if (s.id) {
      setRows((r) => r.map((x) => (x.id === s.id ? res.data! : x)));
      info("Banner tersimpan.");
    } else {
      setRows((r) => [...r, res.data!]);
      setDraf(null);
      info("Banner baru ditambahkan.");
    }
  }

  async function hapus(s: Slide) {
    if (!confirm("Hapus banner ini dari beranda?")) return;
    setBusy(s.id);
    const res = await fetch(`/api/admin/hero?id=${s.id}`, { method: "DELETE" });
    const j = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return info(j.error ?? "Gagal menghapus.", false);
    setRows((r) => r.filter((x) => x.id !== s.id));
    info("Banner dihapus.");
  }

  async function geser(i: number, arah: -1 | 1) {
    const j = i + arah;
    if (j < 0 || j >= rows.length) return;
    const baru = [...rows];
    [baru[i], baru[j]] = [baru[j], baru[i]];
    const terurut = baru.map((s, k) => ({ ...s, sort_order: k + 1 }));
    setRows(terurut);
    setBusy("urut");
    const hasil = await Promise.all([terurut[i], terurut[j]].map((s) => simpanKeServer(s)));
    setBusy(null);
    if (hasil.some((h) => h.error)) info("Gagal menyimpan urutan.", false);
  }

  async function aktifkan(s: Slide) {
    const res = await simpanKeServer({ ...s, is_active: !s.is_active });
    if (res.data) setRows((r) => r.map((x) => (x.id === s.id ? res.data! : x)));
    else info(res.error!, false);
  }

  return (
    <div className="space-y-4">
      <input ref={fileRef} type="file" accept={TIPE.join(",")} className="hidden" onChange={onPilihFile} />

      <p className="rounded-xl bg-slate-50 px-4 py-2.5 text-xs text-slate-600">
        Ukuran gambar disarankan <b>1080 × 1350 px</b> (rasio 4:5, potret), maks 5 MB. Bagian atas gambar selalu terlihat;
        bagian bawah tertutup teks & tombol.
      </p>

      {pesan && (
        <p role="status" className={`rounded-xl px-4 py-2.5 text-sm ${pesan.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
          {pesan.teks}
        </p>
      )}

      {rows.length === 0 && !draf && (
        <p className="rounded-2xl border border-dashed bg-white px-4 py-8 text-center text-sm text-muted-foreground">
          Belum ada banner. Beranda memakai banner bawaan sampai kamu menambahkannya.
        </p>
      )}

      {rows.map((s, i) => (
        <div key={s.id} className={`flex flex-col gap-4 rounded-2xl border bg-white p-4 sm:flex-row ${s.is_active ? "" : "opacity-60"}`}>
          <Gambar url={s.image_url} onGanti={() => pilihGambar(s.id)} sibuk={busy === `unggah-${s.id}`} />
          <div className="flex flex-1 flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">
                Slide {i + 1} {s.is_active ? "" : "· disembunyikan"}
              </span>
              <div className="flex gap-1">
                <button type="button" onClick={() => geser(i, -1)} disabled={i === 0 || !!busy} title="Naikkan"
                  className="rounded-md border p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"><ArrowUp className="h-4 w-4" /></button>
                <button type="button" onClick={() => geser(i, 1)} disabled={i === rows.length - 1 || !!busy} title="Turunkan"
                  className="rounded-md border p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"><ArrowDown className="h-4 w-4" /></button>
                <button type="button" onClick={() => aktifkan(s)} title={s.is_active ? "Sembunyikan" : "Tampilkan"}
                  className="rounded-md border p-1.5 text-slate-600 hover:bg-slate-50">
                  {s.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button type="button" onClick={() => hapus(s)} disabled={busy === s.id} title="Hapus"
                  className="rounded-md border p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
            <Formulir d={s} set={(f, v) => ubah(s.id, f as keyof Slide, v)} />
            <div>
              <button type="button" onClick={() => simpan(s)} disabled={busy === s.id}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#8B0000] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#6B0000] disabled:opacity-60">
                {busy === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan perubahan
              </button>
            </div>
          </div>
        </div>
      ))}

      {draf ? (
        <div className="flex flex-col gap-4 rounded-2xl border-2 border-dashed border-[#8B0000]/30 bg-white p-4 sm:flex-row">
          <Gambar url={draf.image_url} onGanti={() => pilihGambar("draf")} sibuk={busy === "unggah-draf"} />
          <div className="flex flex-1 flex-col gap-3">
            <span className="text-xs font-bold text-[#8B0000]">Banner baru</span>
            <Formulir d={draf} set={(f, v) => setDraf((d) => (d ? { ...d, [f]: v } : d))} />
            <div className="flex gap-2">
              <button type="button" onClick={() => (draf.image_url ? simpan(draf) : info("Unggah gambar dulu.", false))}
                disabled={busy === "draf"}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#8B0000] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#6B0000] disabled:opacity-60">
                {busy === "draf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Tambahkan
              </button>
              <button type="button" onClick={() => setDraf(null)} className="rounded-md border px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
                Batal
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button type="button"
          onClick={() => setDraf({ ...KOSONG, sort_order: Math.max(0, ...rows.map((r) => r.sort_order)) + 1 })}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-3 text-sm font-semibold text-slate-600 hover:border-[#8B0000] hover:text-[#8B0000]">
          <Plus className="h-4 w-4" /> Tambah banner
        </button>
      )}
    </div>
  );
}
