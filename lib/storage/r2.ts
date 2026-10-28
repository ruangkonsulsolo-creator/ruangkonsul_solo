// Cloudflare R2 — alternatif Supabase Storage untuk cost efficiency di skala besar
// npm install @aws-sdk/client-s3 (R2 kompatibel dengan S3 API)

export const r2Config = {
  endpoint: process.env.R2_ENDPOINT!,
  accessKeyId: process.env.R2_ACCESS_KEY_ID!,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  bucket: process.env.R2_BUCKET_NAME!,
};

// TODO: implementasi upload, getSignedUrl, delete
