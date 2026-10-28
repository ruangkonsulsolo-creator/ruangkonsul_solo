import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PREVIEW_MODE, PREVIEW_USER } from "@/lib/utils/preview-mode";
import { BRAND } from "@/lib/brand";
import { MessageCircle, Search, Phone, Video, MoreVertical, Send, ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
export const metadata: Metadata = { title: `Chat | ${BRAND.name}` };

const DUMMY_CONVERSATIONS = [
  { id: "c1", name: "Rizky Aditya",      lastMsg: "Makasih banyak mentor, sudah saya revisi",   time: "09:32", unread: 0, whatsapp: "62882007483223", initials: "RA" },
  { id: "c2", name: "Siti Mariyam",       lastMsg: "Mentor, untuk BAB 3 apakah...",               time: "08:15", unread: 2, whatsapp: "628812345678", initials: "SM" },
  { id: "c3", name: "Budi Santoso",       lastMsg: "Sudah saya kirim dokumennya",                 time: "Kemarin", unread: 0, whatsapp: "628999888777", initials: "BS" },
  { id: "c4", name: "Dewi Rahayu",        lastMsg: "Baik, saya tunggu feedbacknya",              time: "Kemarin", unread: 0, whatsapp: "628777666555", initials: "DR" },
  { id: "c5", name: "Ahmad Fauzi",        lastMsg: "Mentor saya mau tanya tentang metodologi",   time: "Sen",    unread: 1, whatsapp: "628555444333", initials: "AF" },
];

async function getConversations() {
  if (PREVIEW_MODE) return DUMMY_CONVERSATIONS;
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const { redirect } = await import("next/navigation");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    const { data: mp } = await supabase.from("mentor_profiles").select("id").eq("user_id", user!.id).single();
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, profiles(full_name, whatsapp)")
      .eq("mentor_id", mp?.id ?? "")
      .order("created_at", { ascending: false })
      .limit(20);
    return (bookings ?? []).map((b: any) => ({
      id: b.id,
      name: b.profiles?.full_name ?? "Klien",
      lastMsg: "Mulai percakapan",
      time: "",
      unread: 0,
      whatsapp: b.profiles?.whatsapp ?? "",
      initials: (b.profiles?.full_name ?? "K").split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase(),
    }));
  } catch {
    return DUMMY_CONVERSATIONS;
  }
}

export default async function MentorChatPage() {
  const conversations = await getConversations() as any[];
  const active = conversations[0];

  return (
    <div className="max-w-4xl">
      <div className="mb-4">
        <h2 className="text-xl font-extrabold text-slate-900">Chat Klien</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Komunikasi langsung dengan klien bimbinganmu.</p>
      </div>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-[280px_1fr] h-[520px]">
          {/* Conversation list */}
          <div className="border-r border-slate-100 flex flex-col">
            {/* Search */}
            <div className="p-3 border-b border-slate-100">
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari klien..."
                  className="bg-transparent text-sm outline-none flex-1 placeholder:text-slate-400"
                />
              </div>
            </div>
            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {conversations.map((c: any, i: number) => (
                <div
                  key={c.id}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-slate-50 ${
                    i === 0 ? "bg-brand-50" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-gradient text-white text-xs font-bold flex-shrink-0">
                    {c.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900 truncate">{c.name}</p>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">{c.time}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground truncate">{c.lastMsg}</p>
                      {c.unread > 0 && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#8B0000] text-[9px] font-bold text-white flex-shrink-0">
                          {c.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat area */}
          <div className="flex flex-col">
            {active ? (
              <>
                {/* Chat header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <button className="sm:hidden flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100">
                      <ArrowLeft className="h-4 w-4 text-slate-500" />
                    </button>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-gradient text-white text-xs font-bold">
                      {active.initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{active.name}</p>
                      <p className="text-[10px] text-green-600 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Online
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <a
                      href={`https://wa.me/${active.whatsapp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100 text-green-600"
                      title="Buka di WhatsApp"
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                    <button className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500">
                      <Video className="h-4 w-4" />
                    </button>
                    <button className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                  <div className="text-center">
                    <span className="text-[10px] text-muted-foreground bg-white rounded-full px-3 py-1 border border-slate-100">
                      Hari ini
                    </span>
                  </div>
                  {/* Incoming */}
                  <div className="flex justify-start">
                    <div className="max-w-[70%] rounded-2xl rounded-tl-sm bg-white border border-slate-100 px-4 py-2.5 shadow-sm">
                      <p className="text-sm text-slate-700">Selamat pagi mentor, saya mau tanya tentang BAB 3 skripsi saya</p>
                      <p className="text-[10px] text-muted-foreground mt-1 text-right">08:15</p>
                    </div>
                  </div>
                  {/* Outgoing */}
                  <div className="flex justify-end">
                    <div className="max-w-[70%] rounded-2xl rounded-tr-sm bg-brand text-white px-4 py-2.5 shadow-sm">
                      <p className="text-sm">Pagi! Silakan kirim dokumen BAB 3-nya ya, nanti saya review</p>
                      <p className="text-[10px] text-white/60 mt-1 text-right">08:20 ✓✓</p>
                    </div>
                  </div>
                  {/* Incoming */}
                  <div className="flex justify-start">
                    <div className="max-w-[70%] rounded-2xl rounded-tl-sm bg-white border border-slate-100 px-4 py-2.5 shadow-sm">
                      <p className="text-sm text-slate-700">Sudah saya kirim dokumennya mentor</p>
                      <p className="text-[10px] text-muted-foreground mt-1 text-right">09:30</p>
                    </div>
                  </div>
                  {/* Outgoing */}
                  <div className="flex justify-end">
                    <div className="max-w-[70%] rounded-2xl rounded-tr-sm bg-brand text-white px-4 py-2.5 shadow-sm">
                      <p className="text-sm">Baik, sudah saya terima. Nanti malam saya kirim feedback-nya ya</p>
                      <p className="text-[10px] text-white/60 mt-1 text-right">09:32 ✓✓</p>
                    </div>
                  </div>
                  {/* Incoming */}
                  <div className="flex justify-start">
                    <div className="max-w-[70%] rounded-2xl rounded-tl-sm bg-white border border-slate-100 px-4 py-2.5 shadow-sm">
                      <p className="text-sm text-slate-700">Makasih banyak mentor, sudah saya revisi</p>
                      <p className="text-[10px] text-muted-foreground mt-1 text-right">09:32</p>
                    </div>
                  </div>
                </div>

                {/* Input */}
                <div className="border-t border-slate-100 p-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Ketik pesan..."
                      className="flex-1 rounded-xl bg-slate-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/20"
                    />
                    <Button size="icon" className="rounded-xl h-10 w-10 flex-shrink-0">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2 text-center">
                    Chat terintegrasi dengan WhatsApp. Klik{" "}
                    <a href={`https://wa.me/${active.whatsapp}`} target="_blank" rel="noopener noreferrer" className="text-green-600 font-medium underline">di sini</a>{" "}
                    untuk lanjut di WhatsApp.
                  </p>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 text-center">
                <MessageCircle className="h-12 w-12 text-slate-200" />
                <p className="text-sm text-muted-foreground">Belum ada percakapan.</p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
