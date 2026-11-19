import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { DOC_MIME, extOf, magicMatches, MAX_UPLOAD_BYTES } from "@/lib/security/file-check";

export const dynamic = "force-dynamic";

const schema = z.object({ path: z.string().min(10).max(400), name: z.string().min(1).max(255) });

/** Langkah 2 upload: verifikasi file yang sudah ada di storage, lalu catat ke uploaded_files. */
export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user } = auth.ctx;

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Data tidak valid." }, { status: 422 });
  const { path, name } = parsed.data;

  // File harus berada di folder milik user sendiri
  if (!path.startsWith(`${user.id}/`) || path.includes("..")) {
    return NextResponse.json({ error: "Path tidak valid." }, { status: 403 });
  }

  const admin = createAdminClient();
  const bucket = admin.storage.from("documents");
  const dir = path.slice(0, path.lastIndexOf("/"));
  const file = path.slice(path.lastIndexOf("/") + 1);
  const { data: listed } = await bucket.list(dir, { search: file, limit: 1 });
  const meta = listed?.find((o) => o.name === file);
  if (!meta) return NextResponse.json({ error: "File belum terunggah." }, { status: 404 });

  const size = Number((meta.metadata as { size?: number } | null)?.size ?? 0);
  const ext = extOf(path);
  const reject = async (msg: string) => {
    await bucket.remove([path]);
    return NextResponse.json({ error: msg }, { status: 415 });
  };
  if (!DOC_MIME[ext]) return reject("Format tidak didukung.");
  if (size > MAX_UPLOAD_BYTES) return reject("Ukuran file melebihi batas 50 MB.");

  // Baca 8 byte pertama (HTTP Range) untuk cek magic bytes — cegah file berbahaya yang diganti ekstensinya
  const { data: signed } = await bucket.createSignedUrl(path, 60);
  if (!signed) return reject("Gagal memverifikasi file.");
  const head = await fetch(signed.signedUrl, { headers: { Range: "bytes=0-15" }, cache: "no-store" })
    .then((r) => r.arrayBuffer())
    .then((b) => new Uint8Array(b))
    .catch(() => new Uint8Array());
  if (!magicMatches(ext, head)) return reject("Isi file tidak sesuai format PDF/DOCX. File ditolak.");

  const { data: rec, error } = await admin
    .from("uploaded_files")
    .insert({ user_id: user.id, original_name: name.slice(0, 255), storage_path: path, file_size_bytes: size || 1, mime_type: DOC_MIME[ext] })
    .select("id, original_name, file_size_bytes")
    .single();
  if (error || !rec) {
    await bucket.remove([path]);
    return NextResponse.json({ error: "Gagal menyimpan metadata file." }, { status: 500 });
  }

  return NextResponse.json({ data: { file_id: rec.id, original_name: rec.original_name, file_size_bytes: rec.file_size_bytes } });
}
