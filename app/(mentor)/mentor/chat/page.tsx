import type { Metadata } from "next";
import { RuangChat } from "@/components/chat/RuangChat";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: `Chat | ${BRAND.name}` };
export const dynamic = "force-dynamic";

export default function ChatMentorPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Chat Konsultasi</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Percakapan dengan klien bimbinganmu. Percakapan dibuka oleh klien
          lebih dulu.
        </p>
      </div>
      <RuangChat peran="mentor" />
    </div>
  );
}
