"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, Eye, EyeOff, ImagePlus, Loader2, Plus, Save, Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { hargaRingkas } from "@/lib/landing/paket-promo-data";

export type Paket = {
  id: string;
  judul: string;
  harga_mulai: number;
  satuan: string;
  kategori: string | null;
  image_url: string;
  fitur: string[];
  cta_label: string;
  cta_href: string;
  sort_order: number;
  is_active: boolean;
};

type Draf = Omit<Paket, "id"> & { id?: string; fiturTeks?: string };

const KOSONG: Draf = {
  judul: "", harga_mulai: 50000, satuan: "per-paket", kategori: "Layanan Utama", image_url: "",
  fitur: [], cta_label: "Lihat Detail", cta_href: "/jadwal", sort_order: 0, is_active: true, fiturTeks: "",
};
const TIPE = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const INPUT = "w-full rounded-md border border-input px-2.5 py-1.5 text-sm font-normal";

const keDraf = (p: Paket): Draf => ({ ...p, fiturTeks: p.fitur.join("\n") });

async function simpanKeServer(d: Draf): Promise<{ data?: Paket; error?: string }> {
  const fitur = (d.fiturTeks ?? d.fitur.join("\n")).split("\n").map((x) => x.trim()).filter(Boolean);
  const res = await fetch("/api/admin/paket-promo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: d.id, judul: d.judul, harga_mulai: Number(d.harga_mulai) || 0, satuan: d.satuan,
      kategori: d.kategori ?? "", image_url: d.image_url, fitur, cta_label: d.cta_label,
      cta_href: d.cta_href, sort_order: d.sort_order, is_active: d.is_active,
    }),
  });
  const j = await res.json().catch(() => ({}));
  return res.ok ? { data: j.data } : { error: j.error ?? "Gagal menyimpan." };
}

function Kolom({ label, children, lebar }: { label: string; children: React.ReactNode; lebar?: boolean }) {
  return (
    <label className={`space-y-1 text-[11px] font-semibold text-slate-500 ${lebar ? "sm:col-span-2" : ""}`}>
      {label}
      {children}
    </label>
  );
}

function Formulir({ d, set }: { d: Draf; set: (f: keyof Draf, v: unknown) => void }) {
  return (
    <div className="grid flex-1 gap-2 sm:grid-cols-2">
      <Kolom label="Judul paket" lebar>
        <input value={d.judul} maxLength={120} onChange={(e) => set("judul", e.target.value)} placeholder="Bimbingan Skripsi & Tesis" className={INPUT} />
      </Kolom>
      <Kolom label={`Harga mulai (Rp) — tampil "${hargaRingkas(Number(d.harga_mulai) || 0)}"`}>
        <input type="number" min={0} value={d.harga_mulai} onChange={(e) => set("harga_mulai", Number(e.target.value))} className={INPUT} />
      </Kolom>
      <Kolom label="Satuan">
        <input value={d.satuan} maxLength={40} onChange={(e) => set("satuan", e.target.value)} placeholder="per-paket / per-jam / per-1000 kata" className={INPUT} />
      </Kolom>
      <Kolom label="Kategori (teks kecil)">
        <input value={d.kategori ?? ""} maxLength={60} onChange={(e) => set("kategori", e.target.value)} placeholder="Layanan Utama" className={INPUT} />
      </Kolom>
      <Kolom label="Teks tombol">
        <input value={d.cta_label} maxLength={40} onChange={(e) => set("cta_label", e.target.value)} placeholder="Pilih Jadwal" className={INPUT} />
      </Kolom>
      <Kolom label="Link tombol" lebar>
        <input value={d.cta_href} maxLength={300} onChange={(e) => set("cta_href", e.target.value)} placeholder="/jadwal, /produk/…, atau https://…" className={INPUT} />
      </Kolom>
      <Kolom label="Poin keunggulan (satu per baris, maks 8)" lebar>
        <textarea rows={4} value={d.fiturTeks ?? ""} onChange={(e) => set("fiturTeks", e.target.value)}
          placeholder={"Untuk skripsi, tesis & disertasi\nPilih mentor sesuai bidang"} className={INPUT} />
      </Kolom>
    </div>
  );
}

function Poster({ url, onGanti, sibuk }: { url: string; onGanti: () => void; sibuk: boolean }) {
  return (
    <div className="w-full shrink-0 sm:w-44">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl border bg-slate-100">
        {url ? (
          <Image src={url} alt="" fill sizes="176px" className="object-cover object-top" unoptimized={url.startsWith("http")} />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-300"><ImagePlus className="h-8 w-8" /></div>
        )}
      </div>
      <button type="button" onClick={onGanti} disabled={sibuk}
        className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
        {sibuk ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        {url ? "Ganti poster" : "Unggah poster"}
      </button>
    </div>
  );
}

/** Hak akses ditegakkan API (wajibStaf) + RLS paket_promo & storage. */
export function KelolaPaketPromo({ awal }: { awal: Paket[] }) {
  const supabase = createClient();
  const [rows, setRows] = useState<Draf[]>(awal.map(keDraf));
  const [draf, setDraf] = useState<Draf | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pesan, setPesan] = useState<{ teks: string; ok: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [target, setTarget] = useState<string | null>(null);
  const info = (teks: string, ok = true) => setPesan({ teks, ok });

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !target) return;
    if (!TIPE.includes(file.type)) return info("Format gambar harus JPG, PNG, WebP, atau AVIF.", false);
    if (file.size > 5 * 1024 * 1024) return info("Ukuran gambar maksimal 5 MB.", false);
    setBusy(`unggah-${target}`);
    const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `paket/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("public-assets").upload(path, file, { contentType: file.type });
    if (error) {
      info(`Gagal mengunggah: ${error.message}`, false);
    } else {
      const url = supabase.storage.from("public-assets").getPublicUrl(path).data.publicUrl;
      if (target === "draf") setDraf((d) => (d ? { ...d, image_url: url } : d));
      else setRows((r) => r.map((x) => (x.id === target ? { ...x, image_url: url } : x)));
      info(target === "draf" ? "Poster terunggah. Lengkapi lalu klik Tambahkan." : "Poster terunggah. Klik Simpan perubahan.");
    }
    setBusy(null);
    setTarget(null);
  }

  const pilih = (t: string) => { setTarget(t); setTimeout(() => fileRef.current?.click(), 0); };

  async function simpan(d: Draf) {
    setBusy(d.id ?? "draf");
    const res = await simpanKeServer(d);
    setBusy(null);
    if (!res.data) return info(res.error!, false);
    if (d.id) { setRows((r) => r.map((x) => (x.id === d.id ? keDraf(res.data!) : x))); info("Paket tersimpan."); }
    else { setRows((r) => [...r, keDraf(res.data!)]); setDraf(null); info("Paket baru ditambahkan."); }
  }

  async function hapus(d: Draf) {
    if (!d.id || !confirm(`Hapus paket "${d.judul}" dari beranda?`)) return;
    setBusy(d.id);
    const res = await fetch(`/api/admin/paket-promo?id=${d.id}`, { method: "DELETE" });
    const j = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return info(j.error ?? "Gagal menghapus.", false);
    setRows((r) => r.filter((x) => x.id !== d.id));
    info("Paket dihapus.");
  }

  async function geser(i: number, arah: -1 | 1) {
    const j = i + arah;
    if (j < 0 || j >= rows.length) return;
    const baru = [...rows];
    [baru[i], baru[j]] = [baru[j], baru[i]];
    const urut = baru.map((x, k) => ({ ...x, sort_order: k + 1 }));
    setRows(urut);
    setBusy("urut");
    const h = await Promise.all([urut[i], urut[j]].map(simpanKeServer));
    setBusy(null);
    if (h.some((x) => x.error)) info("Gagal menyimpan urutan.", false);
  }

  async function aktifkan(d: Draf) {
    const res = await simpanKeServer({ ...d, is_active: !d.is_active });
    if (res.data) setRows((r) => r.map((x) => (x.id === d.id ? keDraf(res.data!) : x)));
    else info(res.error!, false);
  }

  const ubah = (id: string, f: keyof Draf, v: unknown) => setRows((r) => r.map((x) => (x.id === id ? { ...x, [f]: v } : x)));

  return (
    <div className="space-y-4">
      <input ref={fileRef} type="file" accept={TIPE.join(",")} className="hidden" onChange={onFile} />
      <p className="rounded-xl bg-slate-50 px-4 py-2.5 text-xs text-slate-600">
        Poster disarankan <b>1200 × 900 px</b> (rasio 4:3, mendatar), maks 5 MB. Kartu di beranda bisa digeser
        kiri-kanan; urutan di sini = urutan tampil.
      </p>
      {pesan && (
        <p role="status" className={`rounded-xl px-4 py-2.5 text-sm ${pesan.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>{pesan.teks}</p>
      )}
      {rows.length === 0 && !draf && (
        <p className="rounded-2xl border border-dashed bg-white px-4 py-8 text-center text-sm text-muted-foreground">
          Belum ada paket. Bagian &ldquo;Paket Layanan&rdquo; di beranda disembunyikan sampai ada paket aktif.
        </p>
      )}

      {rows.map((d, i) => (
        <div key={d.id} className={`flex flex-col gap-4 rounded-2xl border bg-white p-4 sm:flex-row ${d.is_active ? "" : "opacity-60"}`}>
          <Poster url={d.image_url} onGanti={() => pilih(d.id!)} sibuk={busy === `unggah-${d.id}`} />
          <div className="flex flex-1 flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Paket {i + 1}{d.is_active ? "" : " · disembunyikan"}</span>
              <div className="flex gap-1">
                <button type="button" onClick={() => geser(i, -1)} disabled={i === 0 || !!busy} title="Geser ke kiri"
                  className="rounded-md border p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"><ArrowUp className="h-4 w-4" /></button>
                <button type="button" onClick={() => geser(i, 1)} disabled={i === rows.length - 1 || !!busy} title="Geser ke kanan"
                  className="rounded-md border p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"><ArrowDown className="h-4 w-4" /></button>
                <button type="button" onClick={() => aktifkan(d)} title={d.is_active ? "Sembunyikan" : "Tampilkan"}
                  className="rounded-md border p-1.5 text-slate-600 hover:bg-slate-50">{d.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                <button type="button" onClick={() => hapus(d)} disabled={busy === d.id} title="Hapus"
                  className="rounded-md border p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
            <Formulir d={d} set={(f, v) => ubah(d.id!, f, v)} />
            <div>
              <button type="button" onClick={() => simpan(d)} disabled={busy === d.id}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#8B0000] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#6B0000] disabled:opacity-60">
                {busy === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan perubahan
              </button>
            </div>
          </div>
        </div>
      ))}

      {draf ? (
        <div className="flex flex-col gap-4 rounded-2xl border-2 border-dashed border-[#8B0000]/30 bg-white p-4 sm:flex-row">
          <Poster url={draf.image_url} onGanti={() => pilih("draf")} sibuk={busy === "unggah-draf"} />
          <div className="flex flex-1 flex-col gap-3">
            <span className="text-xs font-bold text-[#8B0000]">Paket baru</span>
            <Formulir d={draf} set={(f, v) => setDraf((x) => (x ? { ...x, [f]: v } : x))} />
            <div className="flex gap-2">
              <button type="button" onClick={() => (draf.image_url ? simpan(draf) : info("Unggah poster dulu.", false))} disabled={busy === "draf"}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#8B0000] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#6B0000] disabled:opacity-60">
                {busy === "draf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Tambahkan
              </button>
              <button type="button" onClick={() => setDraf(null)} className="rounded-md border px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">Batal</button>
            </div>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setDraf({ ...KOSONG, sort_order: Math.max(0, ...rows.map((r) => r.sort_order)) + 1 })}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-3 text-sm font-semibold text-slate-600 hover:border-[#8B0000] hover:text-[#8B0000]">
          <Plus className="h-4 w-4" /> Tambah paket
        </button>
      )}
    </div>
  );
}
