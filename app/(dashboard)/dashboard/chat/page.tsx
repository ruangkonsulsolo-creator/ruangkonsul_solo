import type { Metadata } from "next";
import { RuangChat } from "@/components/chat/RuangChat";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: `Chat Mentor | ${BRAND.name}` };
export const dynamic = "force-dynamic";

export default function ChatCustomerPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Chat Mentor</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Tanya apa saja soal bimbinganmu. Mentor membalas pada jam kerja.
        </p>
      </div>
      <RuangChat peran="customer" />
    </div>
  );
}
