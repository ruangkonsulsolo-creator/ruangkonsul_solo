import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/security/rate-limit";
import { safeFileName, validateDocMeta } from "@/lib/security/file-check";

export const dynamic = "force-dynamic";

const schema = z.object({ name: z.string().min(1).max(255), size: z.number().int().positive(), type: z.string().max(120) });

/**
 * Langkah 1 upload: minta signed upload URL. Browser mengunggah langsung ke
 * Supabase Storage (melewati batas body 4,5 MB serverless), lalu memanggil
 * /api/upload/complete untuk verifikasi isi file.
 */
export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user } = auth.ctx;

  if (!(await rateLimit(`upload:${user.id}`, 600, 20))) {
    return NextResponse.json({ error: "Terlalu banyak upload. Coba lagi dalam beberapa menit." }, { status: 429 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Data file tidak valid." }, { status: 422 });
  const err = validateDocMeta(parsed.data.name, parsed.data.size, parsed.data.type);
  if (err) return NextResponse.json({ error: err }, { status: 415 });

  const path = `${user.id}/${Date.now()}_${safeFileName(parsed.data.name)}`;
  const { data, error } = await createAdminClient().storage.from("documents").createSignedUploadUrl(path);
  if (error || !data) return NextResponse.json({ error: "Gagal menyiapkan upload." }, { status: 500 });

  return NextResponse.json({ data: { path: data.path, token: data.token } });
}
