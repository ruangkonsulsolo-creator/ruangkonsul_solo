"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toast, useToast } from "@/components/ui/toast";
import { CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { BRAND, waLink } from "@/lib/brand";

interface Mentor { id: string; bio: string | null; specializations: string[]; price_per_hour: number; rating_avg: number; session_count: number; profiles: { full_name: string } | null; }

interface Props { mentors: Mentor[]; }

const KEBUTUHAN_OPTIONS = [
  "Bimbingan Skripsi S1",
  "Bimbingan Tesis S2",
  "Cek Turnitin & Plagiasi",
  "AI Detector",
  "Jasa Parafrase",
  "Bimbingan Lomba BPC/BCC",
  "Bimbingan Lomba KTI/Essay",
  "Bimbingan SPSS/SmartPLS",
  "Bimbingan Python/R Studio",
  "Seminar Akademik",
  "Konsultasi Proposal",
  "Lainnya",
];

const JAM_OPTIONS = [
  "09:00","10:00","11:00","12:00","13:00","14:00",
  "15:00","16:00","17:00","18:00","19:00","20:00","21:00",
];

export function BookingForm({ mentors }: Props) {
  const { toast, showToast, hideToast } = useToast();
  const [form, setForm] = useState({
    nama: "", prodi: "", whatsapp: "",
    mentor_id: "",
    tanggal: "", jam: "09:00",
    kebutuhan: [] as string[],
    catatan: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function toggleKebutuhan(item: string) {
    setForm((f) => ({
      ...f,
      kebutuhan: f.kebutuhan.includes(item)
        ? f.kebutuhan.filter((k) => k !== item)
        : [...f.kebutuhan, item],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nama || !form.whatsapp || !form.kebutuhan.length) {
      showToast("Nama, WhatsApp, dan kebutuhan konsultasi wajib diisi.", "error");
      return;
    }
    setSubmitting(true);

    // Kirim via API booking
    const res = await fetch("/api/booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      showToast(json.error ?? "Gagal mengirim booking. Coba lagi.", "error");
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
    setSubmitting(false);
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center text-center py-10 space-y-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50">
          <CheckCircle2 className="h-8 w-8 text-[#8B0000]" />
        </div>
        <h3 className="text-xl font-extrabold text-slate-900">Booking Terkirim! 🎉</h3>
        <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
          Tim <strong>{BRAND.name}</strong> akan menghubungi kamu via WhatsApp dalam waktu 1×24 jam untuk konfirmasi jadwal.
        </p>
        <a href={waLink(`Halo, saya ${form.nama} baru saja booking bimbingan untuk ${form.kebutuhan.join(", ")}`)}
          target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-xl bg-[#8B0000] text-white px-5 py-2.5 text-sm font-extrabold hover:bg-brand-light transition-colors shadow-brand-sm">
          Chat WhatsApp Sekarang <ArrowRight className="h-4 w-4" />
        </a>
        <button onClick={() => setSubmitted(false)} className="text-xs text-muted-foreground hover:text-[#8B0000]">
          Buat booking lain
        </button>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Data diri */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-card">
          <p className="text-sm font-bold text-slate-800">Data Diri</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Nama Lengkap *</Label>
              <Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })}
                placeholder="Budi Santoso" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Program Studi</Label>
              <Input value={form.prodi} onChange={(e) => setForm({ ...form, prodi: e.target.value })}
                placeholder="Manajemen, Teknik Sipil, dll" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-semibold text-slate-600">Nomor WhatsApp *</Label>
              <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                placeholder="08xxxxxxxxxx" type="tel" required />
              <p className="text-[10px] text-muted-foreground">Untuk konfirmasi jadwal dari tim kami</p>
            </div>
          </div>
        </div>

        {/* Pilih mentor (opsional) */}
        {mentors.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-card">
            <p className="text-sm font-bold text-slate-800">Pilih Mentor <span className="text-muted-foreground font-normal">(opsional)</span></p>
            <div className="space-y-2">
              <label className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${!form.mentor_id ? "border-[#8B0000] bg-brand-50" : "border-slate-200 hover:bg-slate-50"}`}>
                <input type="radio" name="mentor" value="" checked={!form.mentor_id}
                  onChange={() => setForm({ ...form, mentor_id: "" })} className="text-brand focus:ring-brand" />
                <span className="text-sm font-medium text-slate-700">Assign oleh Tim (Rekomendasi)</span>
              </label>
              {mentors.map((m) => (
                <label key={m.id} className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${form.mentor_id === m.id ? "border-[#8B0000] bg-brand-50" : "border-slate-200 hover:bg-slate-50"}`}>
                  <input type="radio" name="mentor" value={m.id} checked={form.mentor_id === m.id}
                    onChange={() => setForm({ ...form, mentor_id: m.id })} className="text-brand focus:ring-brand" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{(m.profiles as any)?.full_name ?? "Mentor"}</p>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {(m.specializations ?? []).slice(0, 3).map((sp: string) => (
                        <span key={sp} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{sp}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-[#8B0000]">⭐ {m.rating_avg}</p>
                    <p className="text-[10px] text-slate-400">{m.session_count} sesi</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Jadwal */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-card">
          <p className="text-sm font-bold text-slate-800">Preferensi Jadwal <span className="text-muted-foreground font-normal">(opsional)</span></p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Tanggal</Label>
              <input type="date" value={form.tanggal} min={new Date().toISOString().slice(0,10)}
                onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:ring-2 focus:ring-brand focus:outline-none" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Sesi (09.00–21.00 WIB)</Label>
              <select value={form.jam} onChange={(e) => setForm({ ...form, jam: e.target.value })}
                className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:ring-2 focus:ring-brand focus:outline-none">
                {JAM_OPTIONS.map((j) => <option key={j} value={j}>{j} WIB</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Kebutuhan konsultasi */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-card">
          <p className="text-sm font-bold text-slate-800">Kebutuhan Konsultasi * <span className="text-muted-foreground font-normal">(bisa pilih lebih dari satu)</span></p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {KEBUTUHAN_OPTIONS.map((opt) => {
              const checked = form.kebutuhan.includes(opt);
              return (
                <button key={opt} type="button" onClick={() => toggleKebutuhan(opt)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-colors ${checked ? "border-[#8B0000] bg-brand-50 text-[#8B0000]" : "border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:bg-slate-50"}`}>
                  {checked && <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />}
                  <span className={checked ? "" : "pl-[19px]"}>{opt}</span>
                </button>
              );
            })}
          </div>
          {form.kebutuhan.length > 0 && (
            <p className="text-xs text-[#8B0000] font-medium">Dipilih: {form.kebutuhan.join(", ")}</p>
          )}
        </div>

        {/* Catatan */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2 shadow-card">
          <Label className="text-xs font-semibold text-slate-600">Catatan Tambahan</Label>
          <textarea value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })}
            rows={3} placeholder="Ceritakan sedikit tentang kebutuhanmu..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand focus:outline-none resize-none" />
        </div>

        <Button type="submit" size="lg" className="w-full gap-2" disabled={submitting}>
          {submitting ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Mengirim...</>
          ) : (
            <>Kirim Booking <ArrowRight className="h-4 w-4" /></>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Dengan mengirim form ini, kamu setuju dengan{" "}
          <a href="/syarat" className="text-[#8B0000] hover:underline">Syarat &amp; Ketentuan</a> {BRAND.name}.
        </p>
      </form>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </>
  );
}
