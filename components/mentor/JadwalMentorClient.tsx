"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Toast, useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2, ToggleLeft, ToggleRight, CalendarDays } from "lucide-react";

interface Slot {
  id: string; slot_date: string; slot_start: string; slot_end: string; is_blocked: boolean;
}
interface Booking { slot_id: string; status: string; profiles: { full_name: string } | null; }

interface Props {
  mentorId: string; isAvailable: boolean;
  slots: Slot[]; bookings: Booking[];
}

const JAM_OPTIONS = [
  "09:00","10:00","11:00","12:00","13:00","14:00",
  "15:00","16:00","17:00","18:00","19:00","20:00","21:00",
];

export function JadwalMentorClient({ mentorId, isAvailable: initAvail, slots: initSlots, bookings }: Props) {
  const supabase = createClient();
  const { toast, showToast, hideToast } = useToast();
  const [slots, setSlots]     = useState(initSlots);
  const [available, setAvail] = useState(initAvail);
  const [toggling, setToggling] = useState(false);
  const [adding, setAdding]   = useState(false);
  const [form, setForm]       = useState({ date: "", start: "09:00", end: "10:00" });

  // Map booking per slot_id
  const bookingMap = Object.fromEntries(bookings.map((b) => [b.slot_id, b]));

  async function toggleAvailability() {
    setToggling(true);
    await supabase.from("mentor_profiles").update({ is_available: !available }).eq("id", mentorId);
    setAvail((v) => !v);
    showToast(available ? "Status diset Tidak Tersedia" : "Status diset Tersedia", "success");
    setToggling(false);
  }

  async function addSlot() {
    if (!form.date || !form.start || !form.end) { showToast("Isi semua field.", "error"); return; }
    if (form.start >= form.end) { showToast("Jam selesai harus lebih dari jam mulai.", "error"); return; }
    setAdding(true);
    const { data, error } = await supabase
      .from("booking_slots")
      .insert({ mentor_id: mentorId, slot_date: form.date, slot_start: form.start + ":00", slot_end: form.end + ":00", is_blocked: false })
      .select().single();
    if (error) showToast("Gagal tambah slot: " + error.message, "error");
    else { setSlots((p) => [...p, data]); showToast("Slot berhasil ditambahkan!", "success"); }
    setAdding(false);
  }

  async function toggleBlock(slot: Slot) {
    await supabase.from("booking_slots").update({ is_blocked: !slot.is_blocked }).eq("id", slot.id);
    setSlots((p) => p.map((s) => s.id === slot.id ? { ...s, is_blocked: !s.is_blocked } : s));
  }

  async function deleteSlot(id: string) {
    if (!confirm("Hapus slot ini?")) return;
    await supabase.from("booking_slots").delete().eq("id", id);
    setSlots((p) => p.filter((s) => s.id !== id));
    showToast("Slot dihapus.", "success");
  }

  // Group by date
  const byDate: Record<string, Slot[]> = {};
  for (const s of slots) {
    if (!byDate[s.slot_date]) byDate[s.slot_date] = [];
    byDate[s.slot_date].push(s);
  }

  return (
    <>
      <div className="space-y-5">
        {/* Toggle ketersediaan */}
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <div>
            <p className="font-semibold text-slate-900">Status Ketersediaan</p>
            <p className="text-xs text-muted-foreground">Aktifkan untuk bisa menerima booking dari klien</p>
          </div>
          <button onClick={toggleAvailability} disabled={toggling}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors ${available ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
            {toggling ? <Loader2 className="h-4 w-4 animate-spin" /> : available ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
            {available ? "Tersedia" : "Tidak Tersedia"}
          </button>
        </div>

        {/* Form tambah slot */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card space-y-3">
          <p className="text-sm font-bold text-slate-800">Tambah Slot Waktu</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-500">Tanggal</label>
              <input type="date" value={form.date} min={new Date().toISOString().slice(0,10)}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:ring-2 focus:ring-brand focus:outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-500">Mulai</label>
              <select value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })}
                className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:ring-2 focus:ring-brand focus:outline-none">
                {JAM_OPTIONS.map((j) => <option key={j} value={j}>{j} WIB</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-500">Selesai</label>
              <select value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })}
                className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:ring-2 focus:ring-brand focus:outline-none">
                {JAM_OPTIONS.filter((j) => j > form.start).map((j) => <option key={j} value={j}>{j} WIB</option>)}
              </select>
            </div>
          </div>
          <Button onClick={addSlot} disabled={adding} size="sm" className="gap-2">
            {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Tambah Slot
          </Button>
        </div>

        {/* Daftar slot per tanggal */}
        {Object.keys(byDate).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center">
            <CalendarDays className="h-8 w-8 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Belum ada slot. Tambahkan slot waktu di atas.</p>
          </div>
        ) : Object.entries(byDate).sort().map(([date, daySlots]) => (
          <div key={date} className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-card">
            <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-100">
              <p className="text-sm font-bold text-slate-800">
                {new Date(date + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}
              </p>
              <p className="text-xs text-muted-foreground">{daySlots.length} slot</p>
            </div>
            <div className="divide-y divide-slate-100">
              {daySlots.sort((a, b) => a.slot_start.localeCompare(b.slot_start)).map((slot) => {
                const booking = bookingMap[slot.id];
                const isBooked = !!booking;
                return (
                  <div key={slot.id} className="flex items-center gap-4 px-5 py-3">
                    <div className="w-28 flex-shrink-0">
                      <p className="text-sm font-semibold text-slate-800">
                        {slot.slot_start.slice(0,5)} – {slot.slot_end.slice(0,5)}
                      </p>
                      <p className="text-[10px] text-slate-400">WIB</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      {isBooked ? (
                        <div>
                          <p className="text-sm font-medium text-slate-700 truncate">{(booking.profiles as any)?.full_name ?? "Klien"}</p>
                          <Badge variant={booking.status === "confirmed" ? "success" : "warning"} className="text-[10px]">
                            {booking.status === "confirmed" ? "Dikonfirmasi" : "Menunggu"}
                          </Badge>
                        </div>
                      ) : (
                        <span className={`text-xs font-medium ${slot.is_blocked ? "text-slate-400" : "text-green-600"}`}>
                          {slot.is_blocked ? "Ditutup" : "Tersedia"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!isBooked && (
                        <>
                          <button onClick={() => toggleBlock(slot)}
                            className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition-colors ${slot.is_blocked ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                            {slot.is_blocked ? "Buka" : "Tutup"}
                          </button>
                          <button onClick={() => deleteSlot(slot.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-red-400 hover:bg-red-50 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </>
  );
}
