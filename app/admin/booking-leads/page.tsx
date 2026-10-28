import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import { PREVIEW_MODE } from "@/lib/utils/preview-mode";
import { Phone, GraduationCap, Calendar, FileText, MessageCircle, Clock } from "lucide-react";
import type { Metadata } from "next";
export const metadata: Metadata = { title: `Booking Leads | Admin ${BRAND.name}` };

const STATUS_CONFIG: Record<string, { label: string; variant: "warning" | "info" | "success" | "destructive" | "muted" }> = {
  baru:      { label: "Baru",          variant: "warning" },
  dihubungi: { label: "Dihubungi",    variant: "info" },
  terjadwal: { label: "Terjadwal",     variant: "success" },
  selesai:   { label: "Selesai",       variant: "muted" },
  batal:     { label: "Batal",         variant: "destructive" },
};

async function getLeads() {
  if (PREVIEW_MODE) {
    return [
      { id: "bl1", nama: "Rizky Aditya", prodi: "Teknik Informatika", sesi: "Bimbingan Skripsi", kebutuhan: "Bimbingan BAB 3 metodologi penelitian", whatsapp: "62882007483223", status: "baru", created_at: new Date().toISOString() },
      { id: "bl2", nama: "Siti Mariyam", prodi: "Manajemen", sesi: "Konsultasi Judul", kebutuhan: "Mau konsultasi pilihan judul tentang digital marketing", whatsapp: "628812345678", status: "dihubungi", created_at: new Date(Date.now() - 86400000).toISOString() },
      { id: "bl3", nama: "Budi Santoso", prodi: "Hukum", sesi: "Parafrase", kebutuhan: "Dokumen 20 halaman perlu parafrase turun plagiasi", whatsapp: "628999888777", status: "terjadwal", created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
      { id: "bl4", nama: "Dewi Rahayu", prodi: "Psikologi", sesi: "Bimbingan Tesis S2", kebutuhan: "Bimbingan analisis data SPSS untuk tesis", whatsapp: "628777666555", status: "selesai", created_at: new Date(Date.now() - 5 * 86400000).toISOString() },
    ];
  }
  try {
    const supabase = createClient();
    const { data, count } = await supabase
      .from("booking_leads")
      .select("id, nama, prodi, sesi, kebutuhan, whatsapp, status, created_at", { count: "exact" })
      .order("created_at", { ascending: false });
    return { data, count };
  } catch {
    return [];
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function AdminBookingLeadsPage() {
  const result = await getLeads() as any;
  const leads = Array.isArray(result) ? result : (result?.data ?? []);
  const totalCount = Array.isArray(result) ? result.length : (result?.count ?? 0);
  const newCount = leads.filter((l: any) => l.status === "baru").length;
  const contactedCount = leads.filter((l: any) => l.status === "dihubungi").length;
  const scheduledCount = leads.filter((l: any) => l.status === "terjadwal").length;

  const summary = [
    { label: "Total Leads",   value: totalCount,       icon: FileText,    color: "text-brand bg-brand-50" },
    { label: "Baru",          value: newCount,          icon: Clock,       color: "text-amber-600 bg-amber-50" },
    { label: "Dihubungi",     value: contactedCount,    icon: Phone,       color: "text-blue-600 bg-blue-50" },
    { label: "Terjadwal",     value: scheduledCount,    icon: Calendar,    color: "text-green-600 bg-green-50" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Booking Leads</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Permintaan booking dari pengunjung (native user).</p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {summary.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${s.color}`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-xl font-extrabold text-slate-900">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Leads table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Prodi</th>
                <th className="px-4 py-3">Sesi</th>
                <th className="px-4 py-3">Kebutuhan</th>
                <th className="px-4 py-3">Kontak</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Waktu</th>
                <th className="px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    Belum ada booking leads.
                  </td>
                </tr>
              ) : (
                leads.map((lead: any) => {
                  const st = STATUS_CONFIG[lead.status] ?? { label: lead.status, variant: "muted" as const };
                  return (
                    <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">{lead.nama}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-xs text-slate-600">
                          <GraduationCap className="h-3.5 w-3.5 text-slate-400" />
                          {lead.prodi}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{lead.sesi}</td>
                      <td className="px-4 py-3 max-w-[240px]">
                        <p className="text-xs text-slate-600 truncate">{lead.kebutuhan}</p>
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={`https://wa.me/${lead.whatsapp}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs font-medium text-[#8B0000] hover:underline"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          {lead.whatsapp}
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(lead.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`https://wa.me/${lead.whatsapp}?text=Halo%20${encodeURIComponent(lead.nama)},%20terima%20kasih%20sudah%20mendaftar%20bimbingan%20di%20${encodeURIComponent(BRAND.name)}.%20Kami%20akan%20membantu%20kebutuhan%20Anda.`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                            title="Chat WA"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
