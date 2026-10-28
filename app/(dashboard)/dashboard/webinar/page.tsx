import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PREVIEW_MODE } from "@/lib/utils/preview-mode";
import { BRAND } from "@/lib/brand";
import { Video, Calendar, Clock, Users, ArrowRight, PlayCircle, CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
export const metadata: Metadata = { title: `Webinar | ${BRAND.name}` };

const UPCOMING = [
  { id: "w1", title: "Strategi Menulis BAB 1 Skripsi yang Benar", date: "2026-08-20", time: "19:00", duration: "90 min", host: "Dr. Ahmad Rifa'i, M.Si.", registered: 127, capacity: 200, isRegistered: true },
  { id: "w2", title: "Tips Lolos Turnitin di Bawah 15%", date: "2026-08-25", time: "20:00", duration: "60 min", host: "Ruang Konsul Solo Team", registered: 89, capacity: 150, isRegistered: false },
  { id: "w3", title: "Workshop Parafrase Akademik yang Efektif", date: "2026-09-02", time: "19:30", duration: "120 min", host: "Prof. Siti Rahmawati", registered: 45, capacity: 100, isRegistered: false },
];

const PAST = [
  { id: "p1", title: "Memilih Topik Skripsi yang Relevan", date: "2026-07-28", duration: "85 min", attendees: 156 },
  { id: "p2", title: "Understanding AI Detection in Academic Writing", date: "2026-07-15", duration: "70 min", attendees: 203 },
  { id: "p3", title: "DrillBit vs Turnitin: Mana yang Cocok?", date: "2026-06-30", duration: "60 min", attendees: 178 },
];

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default async function WebinarPage() {
  return (
    <div className="space-y-7 max-w-4xl">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Webinar & Seminar</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Ikuti webinar gratis dan提升 kualitas skripsi-mu.</p>
      </div>

      {/* Upcoming webinars */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Webinar Mendatang</h3>
        <div className="space-y-4">
          {UPCOMING.map((w) => (
            <Card key={w.id} className="overflow-hidden">
              <div className="flex flex-col sm:flex-row">
                {/* Date badge */}
                <div className="flex sm:flex-col items-center justify-center gap-2 bg-brand-50 px-5 py-4 sm:w-28 flex-shrink-0">
                  <div className="text-center">
                    <p className="text-2xl font-extrabold text-[#8B0000]">{new Date(w.date + "T00:00:00").getDate()}</p>
                    <p className="text-xs font-semibold text-[#8B0000] uppercase">
                      {new Date(w.date + "T00:00:00").toLocaleDateString("id-ID", { month: "short" })}
                    </p>
                  </div>
                </div>
                {/* Content */}
                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h4 className="font-bold text-slate-900">{w.title}</h4>
                    {w.isRegistered && <Badge variant="success">Terdaftar</Badge>}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatDate(w.date)}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {w.time} WIB · {w.duration}</span>
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {w.registered}/{w.capacity}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">Host: <strong className="text-slate-700">{w.host}</strong></p>
                  <Button
                    size="sm"
                    variant={w.isRegistered ? "outline" : "default"}
                    className="gap-2"
                    disabled={w.isRegistered}
                  >
                    {w.isRegistered ? (
                      <><CheckCircle2 className="h-3.5 w-3.5" /> Sudah Terdaftar</>
                    ) : (
                      <>Daftar Webinar <ArrowRight className="h-3.5 w-3.5" /></>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Past webinars */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Webinar Sebelumnya</h3>
        <div className="space-y-3">
          {PAST.map((w) => (
            <Card key={w.id} className="flex items-center gap-4 p-4 hover:border-brand-200 transition-colors group cursor-pointer">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 flex-shrink-0">
                <PlayCircle className="h-5 w-5 text-slate-400 group-hover:text-[#8B0000] transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{w.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(w.date)} · {w.duration} · {w.attendees} peserta
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-[#8B0000] transition-colors flex-shrink-0" />
            </Card>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-5">
        <Video className="h-5 w-5 text-[#8B0000] flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900">Mau jaga update webinar terbaru?</p>
          <p className="text-xs text-muted-foreground mt-0.5">Ikuti Instagram kami untuk notifikasi webinar mendatang.</p>
        </div>
        <Button asChild size="sm" variant="outline" className="gap-2 flex-shrink-0">
          <a href={BRAND.instagramUrl} target="_blank" rel="noopener noreferrer">
            {BRAND.instagram}
          </a>
        </Button>
      </div>
    </div>
  );
}
