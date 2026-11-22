"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, ImagePlus, Loader2, Plus, Save, Trash2, Upload } from "lucide-react";
import { TIPE_GAMBAR, unggahGambarPublik } from "@/lib/admin/unggah-gambar";

export type BannerStrip = {
  id: string;
  title: string;
  image_url: string;
  link_url: string | null;
  sort_order: number;
  is_active: boolean;
};

type Draf = Omit<BannerStrip, "id"> & { id?: string };

const KOSONG: Draf = { title: "", image_url: "", link_url: "", sort_order: 0, is_active: true };
const INPUT = "w-full rounded-md border border-input px-2.5 py-1.5 text-sm font-normal";

async function simpanKeServer(d: Draf): Promise<{ data?: BannerStrip; error?: string }> {
  const res = await fetch("/api/admin/banner-strip", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: d.id,
      title: d.title,
      image_url: d.image_url,
      link_url: d.link_url ?? "",
      sort_order: d.sort_order,
      is_active: d.is_active,
    }),
  });
  const j = await res.json().catch(() => ({}));
  return res.ok ? { data: j.data } : { error: j.error ?? "Gagal menyimpan." };
}

function Pratinjau({ url, onGanti, sibuk }: { url: string; onGanti: () => void; sibuk: boolean }) {
  return (
    <div className="space-y-2">
      <div className="relative aspect-[8/1] w-full overflow-hidden rounded-lg border bg-slate-100">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-300"><ImagePlus className="h-6 w-6" /></div>
        )}
      </div>
      <button type="button" onClick={onGanti} disabled={sibuk}
        className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
        {sibuk ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        {url ? "Ganti gambar" : "Unggah gambar"}
      </button>
    </div>
  );
}

function Formulir({ d, set }: { d: Draf; set: (f: keyof Draf, v: unknown) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="space-y-1 text-[11px] font-semibold text-slate-500">
        Keterangan (untuk aksesibilitas & SEO)
        <input value={d.title} maxLength={200} onChange={(e) => set("title", e.target.value)}
          placeholder="RK Merchandise — buket wisuda" className={INPUT} />
      </label>
      <label className="space-y-1 text-[11px] font-semibold text-slate-500">
        Link saat diklik (opsional)
        <input value={d.link_url ?? ""} maxLength={300} onChange={(e) => set("link_url", e.target.value)}
          placeholder="/merchandise atau https://…" className={INPUT} />
      </label>
    </div>
  );
}

/** Hak akses ditegakkan API (wajibStaf) + RLS banners & storage. */
export function KelolaBannerStrip({ awal }: { awal: BannerStrip[] }) {
  const [rows, setRows] = useState<BannerStrip[]>(awal);
  const [draf, setDraf] = useState<Draf | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pesan, setPesan] = useState<{ teks: string; ok: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [target, setTarget] = useState<string | "draf" | null>(null);

  const info = (teks: string, ok = true) => setPesan({ teks, ok });

  async function onPilihFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !target) return;
    setBusy(`unggah-${target}`);
    const r = await unggahGambarPublik(file, "banner");
    if (!r.url) info(r.error ?? "Gagal mengunggah.", false);
    else if (target === "draf") setDraf((d) => (d ? { ...d, image_url: r.url! } : d));
    else {
      const s = rows.find((x) => x.id === target);
      if (s) {
        const res = await simpanKeServer({ ...s, image_url: r.url });
        if (res.data) { setRows((rs) => rs.map((x) => (x.id === s.id ? res.data! : x))); info("Gambar banner diganti."); }
        else info(res.error!, false);
      }
    }
    setBusy(null);
    setTarget(null);
  }

  function pilihGambar(t: string | "draf") {
    setTarget(t);
    setTimeout(() => fileRef.current?.click(), 0);
  }

  const ubah = (id: string, f: keyof BannerStrip, v: unknown) =>
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

  async function hapus(s: BannerStrip) {
    if (!confirm("Hapus banner ini dari beranda?")) return;
    setBusy(s.id);
    const res = await fetch(`/api/admin/banner-strip?id=${s.id}`, { method: "DELETE" });
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

  async function aktifkan(s: BannerStrip) {
    const res = await simpanKeServer({ ...s, is_active: !s.is_active });
    if (res.data) setRows((r) => r.map((x) => (x.id === s.id ? res.data! : x)));
    else info(res.error!, false);
  }

  async function salinBawaan() {
    setBusy("salin");
    const res = await fetch("/api/admin/banner-strip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ salin_bawaan: true }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return info(j.error ?? "Gagal menyalin.", false);
    setRows(j.data ?? []);
    info("3 banner bawaan disalin. Sekarang bisa diganti, diedit, atau dihapus.");
  }

  return (
    <div className="space-y-4">
      <input ref={fileRef} type="file" accept={TIPE_GAMBAR.join(",")} className="hidden" onChange={onPilihFile} />

      <p className="rounded-xl bg-slate-50 px-4 py-2.5 text-xs text-slate-600">
        Ukuran gambar disarankan <b>2576 × 322 px</b> (rasio 8:1, memanjang), maks 5 MB. Rasio ini sama di laptop dan HP,
        jadi buat teks cukup besar agar tetap terbaca di layar kecil.
      </p>

      {pesan && (
        <p role="status" className={`rounded-xl px-4 py-2.5 text-sm ${pesan.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
          {pesan.teks}
        </p>
      )}

      {rows.length === 0 && !draf && (
        <div className="rounded-2xl border border-dashed bg-white px-4 py-6 text-center text-sm text-muted-foreground">
          <p>Beranda sedang memakai 3 banner bawaan (RK Merchandise, Kelas Data Science, Giveaway).</p>
          <button type="button" onClick={salinBawaan} disabled={busy === "salin"}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-[#8B0000] px-3 py-1.5 text-sm font-semibold text-[#8B0000] hover:bg-red-50 disabled:opacity-60">
            {busy === "salin" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
            Salin banner bawaan agar bisa diedit
          </button>
        </div>
      )}

      {rows.map((s, i) => (
        <div key={s.id} className={`space-y-3 rounded-2xl border bg-white p-4 ${s.is_active ? "" : "opacity-60"}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Banner {i + 1} {s.is_active ? "" : "· disembunyikan"}</span>
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
          <Pratinjau url={s.image_url} onGanti={() => pilihGambar(s.id)} sibuk={busy === `unggah-${s.id}`} />
          <Formulir d={s} set={(f, v) => ubah(s.id, f as keyof BannerStrip, v)} />
          <button type="button" onClick={() => simpan(s)} disabled={busy === s.id}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#8B0000] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#6B0000] disabled:opacity-60">
            {busy === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan perubahan
          </button>
        </div>
      ))}

      {draf ? (
        <div className="space-y-3 rounded-2xl border-2 border-dashed border-[#8B0000]/30 bg-white p-4">
          <span className="text-xs font-bold text-[#8B0000]">Banner baru</span>
          <Pratinjau url={draf.image_url} onGanti={() => pilihGambar("draf")} sibuk={busy === "unggah-draf"} />
          <Formulir d={draf} set={(f, v) => setDraf((d) => (d ? { ...d, [f]: v } : d))} />
          <div className="flex gap-2">
            <button type="button"
              onClick={() => (!draf.image_url ? info("Unggah gambar dulu.", false) : !draf.title.trim() ? info("Isi keterangan banner.", false) : simpan(draf))}
              disabled={busy === "draf"}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#8B0000] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#6B0000] disabled:opacity-60">
              {busy === "draf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Tambahkan
            </button>
            <button type="button" onClick={() => setDraf(null)} className="rounded-md border px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
              Batal
            </button>
          </div>
        </div>
      ) : (
        <button type="button"
          onClick={() => setDraf({ ...KOSONG, sort_order: Math.max(0, ...rows.map((r) => r.sort_order)) + 1 })}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-3 text-sm font-semibold text-slate-600 hover:border-[#8B0000] hover:text-[#8B0000]">
          <Plus className="h-4 w-4" /> Tambah banner strip
        </button>
      )}
    </div>
  );
}
