import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
]);

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

export async function POST(request: NextRequest) {
  const supabase = createClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  // Parse multipart form
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Gagal membaca request." }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "File tidak ditemukan dalam request." }, { status: 400 });
  }

  // Validasi tipe
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: "Format file tidak didukung. Gunakan PDF, DOCX, atau DOC." },
      { status: 415 }
    );
  }

  // Validasi ukuran
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Ukuran file melebihi batas 50 MB." },
      { status: 413 }
    );
  }

  // Buat storage path: documents/{user_id}/{timestamp}_{filename}
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${user.id}/${timestamp}_${safeName}`;

  // Upload ke Supabase Storage bucket "documents"
  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    return NextResponse.json(
      { error: "Gagal mengunggah file. Coba lagi." },
      { status: 500 }
    );
  }

  // Simpan metadata ke tabel uploaded_files
  const { data: fileRecord, error: dbError } = await supabase
    .from("uploaded_files")
    .insert({
      user_id: user.id,
      original_name: file.name,
      storage_path: storagePath,
      file_size_bytes: file.size,
      mime_type: file.type,
    })
    .select("id, original_name, file_size_bytes")
    .single();

  if (dbError || !fileRecord) {
    // Rollback storage upload
    await supabase.storage.from("documents").remove([storagePath]);
    return NextResponse.json(
      { error: "Gagal menyimpan metadata file." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: {
      file_id: fileRecord.id,
      original_name: fileRecord.original_name,
      file_size_bytes: fileRecord.file_size_bytes,
    },
  });
}
