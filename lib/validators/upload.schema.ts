import { z } from "zod";

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/msword", // .doc
] as const;

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export const uploadFileSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.enum(ALLOWED_MIME_TYPES),
  fileSizeBytes: z.number().max(MAX_FILE_SIZE_BYTES, {
    message: "Ukuran file melebihi batas 50 MB.",
  }),
});
