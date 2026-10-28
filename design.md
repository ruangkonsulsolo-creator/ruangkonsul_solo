# Kalibri — Design Document

> Arsitektur sistem, skema database, API design, dan alur kerja untuk platform Kalibri.

**Versi:** 1.0  
**Tanggal:** 15 Agustus 2026  
**Merujuk ke:** `requirements.md` v1.0

---

## 1. Arsitektur Sistem

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│              Next.js 14 App Router (SSR/SSG/CSR)                │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────▼────────────────────────────────────┐
│                       VERCEL EDGE                               │
│     middleware.ts  (auth guard · rate limit · role check)       │
└──────┬──────────────────────┬──────────────────────┬────────────┘
       │                      │                      │
┌──────▼──────┐   ┌───────────▼──────────┐  ┌───────▼────────┐
│  App Routes │   │   Next.js API Routes │  │  Static Assets │
│  (RSC/page) │   │   /api/*             │  │  (CDN)         │
└──────┬──────┘   └───────────┬──────────┘  └────────────────┘
       │                      │
       └──────────┬───────────┘
                  │
┌─────────────────▼───────────────────────────────────────────────┐
│                        SUPABASE                                 │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │  Auth (JWT)  │  │  Postgres DB │  │  Storage (Buckets)    │ │
│  │              │  │  + RLS       │  │  - documents (private)│ │
│  └──────────────┘  └──────────────┘  │  - reports (private)  │ │
│                                      └───────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Edge Functions (Deno)                                   │   │
│  │  - process-order-queue  - send-whatsapp-notification     │   │
│  │  - expire-quota-checker (cron)                           │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                  │                      │
     ┌────────────▼─────────┐  ┌────────▼──────────┐
     │   Midtrans Payment   │  │  Fonnte / Resend   │
     │   (SNAP + Webhook)   │  │  (WA + Email)      │
     └──────────────────────┘  └───────────────────┘
```

### 1.2 Rendering Strategy per Route

| Route Group | Strategy | Alasan |
|---|---|---|
| `(marketing)/` | SSG + ISR (revalidate 3600s) | SEO, performa tinggi |
| `(marketing)/blog/[slug]` | ISR (revalidate 1800s) | Konten berubah jarang |
| `(auth)/` | CSR (client component) | Form interaktif, tidak perlu SEO |
| `(dashboard)/` | SSR + Client Components | Data real-time user, auth-gated |
| `admin/` | SSR + Client Components | Data real-time, auth-gated |
| `api/` | Edge Runtime / Node Runtime | Sesuai kebutuhan per route |

### 1.3 Alur Order End-to-End

```
User Upload File
      │
      ▼
[1] POST /api/upload
    - Validasi file (type, size)
    - Upload ke Supabase Storage bucket "documents"
    - Return: file_id, storage_path
      │
      ▼
[2] POST /api/order
    - Cek kuota aktif user (jika ada)
    - Hitung harga (kuota/satuan)
    - Buat record orders (status: menunggu_pembayaran)
    - Jika kuota cukup → potong kuota → status: diproses
    - Jika perlu bayar → buat Midtrans transaction → return snap_token
      │
      ├─── Jika pakai kuota ──────────────────────────────────────┐
      │                                                           │
      ▼                                                           ▼
[3a] Redirect ke dashboard                               [3b] Midtrans SNAP UI
     (pesanan langsung diproses)                               │
                                                               ▼
                                                        [4] Webhook Midtrans
                                                            POST /api/payment/webhook
                                                            - Verifikasi signature
                                                            - Update order status → diproses
                                                            - Kirim notif WA ke user
      │
      ▼
[5] Admin Panel: Pesanan masuk antrian
    - Admin download file dokumen
    - Admin proses di tools eksternal
    - Admin upload laporan PDF
    - Admin set status → selesai
      │
      ▼
[6] Trigger Supabase Edge Function
    - Kirim notif WA + email ke user
    - Signed URL laporan (expire 1 jam) di email

[7] User download laporan dari dashboard
    GET /api/report/[id] → redirect ke signed URL
```

---

## 2. Skema Database (Supabase Postgres)

### 2.1 Tabel: `profiles`

Extends tabel `auth.users` bawaan Supabase.

```sql
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT,
  whatsapp      TEXT,                        -- format: 628xxxxx
  referral_code TEXT UNIQUE NOT NULL,        -- kode unik: KLB-XXXXX
  referred_by   UUID REFERENCES public.profiles(id),
  credit_balance INTEGER NOT NULL DEFAULT 0, -- kredit referral dalam satuan Rupiah
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "User can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin can read all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );
```

### 2.2 Tabel: `services`

Konfigurasi layanan dan harga (dikelola Super Admin).

```sql
CREATE TABLE public.services (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,  -- 'plagiasi' | 'ai-detector' | 'drillbit' | 'parafrase'
  name          TEXT NOT NULL,
  description   TEXT,
  price_idr     INTEGER NOT NULL,      -- harga satuan dalam Rupiah
  is_active     BOOLEAN NOT NULL DEFAULT true,
  max_file_size_mb INTEGER NOT NULL DEFAULT 50,
  allowed_formats TEXT[] NOT NULL DEFAULT '{pdf,docx,doc}',
  sla_hours     INTEGER NOT NULL DEFAULT 24, -- estimasi selesai
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed data awal
INSERT INTO public.services (slug, name, price_idr, sla_hours) VALUES
  ('plagiasi',    'Cek Plagiasi',    35000, 24),
  ('ai-detector', 'AI Detector',     25000, 12),
  ('drillbit',    'DrillBit Checker',45000, 48),
  ('parafrase',   'Jasa Parafrase',  75000, 72);
```

### 2.3 Tabel: `quota_packages`

Definisi paket hemat (dikelola Super Admin).

```sql
CREATE TABLE public.quota_packages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,               -- 'Starter', 'Popular', 'Pro'
  service_id    UUID NOT NULL REFERENCES public.services(id),
  quota_amount  INTEGER NOT NULL,            -- jumlah penggunaan (10, 25, 50)
  price_idr     INTEGER NOT NULL,            -- harga paket
  validity_days INTEGER NOT NULL,            -- masa aktif dalam hari
  is_active     BOOLEAN NOT NULL DEFAULT true,
  is_popular    BOOLEAN NOT NULL DEFAULT false, -- badge "Terpopuler"
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.4 Tabel: `user_quotas`

Saldo kuota yang dimiliki user.

```sql
CREATE TABLE public.user_quotas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  package_id      UUID NOT NULL REFERENCES public.quota_packages(id),
  service_id      UUID NOT NULL REFERENCES public.services(id),
  quota_remaining INTEGER NOT NULL,           -- sisa kuota
  quota_total     INTEGER NOT NULL,           -- total kuota saat beli
  purchased_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL,       -- purchased_at + validity_days
  is_expired      BOOLEAN NOT NULL DEFAULT false,

  CONSTRAINT quota_remaining_non_negative CHECK (quota_remaining >= 0)
);

CREATE INDEX idx_user_quotas_user_id ON public.user_quotas(user_id);
CREATE INDEX idx_user_quotas_expires_at ON public.user_quotas(expires_at);

-- RLS
ALTER TABLE public.user_quotas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User can read own quotas" ON public.user_quotas
  FOR SELECT USING (auth.uid() = user_id);
```

### 2.5 Tabel: `uploaded_files`

Metadata file yang di-upload user.

```sql
CREATE TABLE public.uploaded_files (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  original_name   TEXT NOT NULL,
  storage_path    TEXT NOT NULL,          -- path di Supabase Storage bucket "documents"
  file_size_bytes BIGINT NOT NULL,
  mime_type       TEXT NOT NULL,
  page_count      INTEGER,                -- diisi jika tersedia (untuk parafrase pricing)
  word_count      INTEGER,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted      BOOLEAN NOT NULL DEFAULT false  -- soft delete setelah order selesai/batal
);

-- RLS
ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User can read own files" ON public.uploaded_files
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin can read all files" ON public.uploaded_files
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );
```

### 2.6 Tabel: `orders`

Inti dari sistem — setiap pesanan per file.

```sql
CREATE TYPE order_status AS ENUM (
  'menunggu_pembayaran',
  'dibayar',
  'diproses',
  'selesai',
  'dibatalkan'
);

CREATE TABLE public.orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number      TEXT UNIQUE NOT NULL,     -- KLB-20260815-XXXX (human-readable)
  user_id           UUID NOT NULL REFERENCES public.profiles(id),
  service_id        UUID NOT NULL REFERENCES public.services(id),
  file_id           UUID NOT NULL REFERENCES public.uploaded_files(id),

  -- Pricing
  price_idr         INTEGER NOT NULL,         -- harga yang dikenakan (0 jika pakai kuota)
  used_quota_id     UUID REFERENCES public.user_quotas(id), -- null jika bayar satuan

  -- Payment
  status            order_status NOT NULL DEFAULT 'menunggu_pembayaran',
  payment_method    TEXT,                     -- 'quota' | 'midtrans'
  midtrans_order_id TEXT UNIQUE,              -- order_id yang dikirim ke Midtrans
  midtrans_snap_token TEXT,
  paid_at           TIMESTAMPTZ,

  -- Processing
  assigned_admin_id UUID REFERENCES public.profiles(id),
  admin_notes       TEXT,
  processed_at      TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  cancelled_at      TIMESTAMPTZ,
  cancel_reason     TEXT,

  -- Report
  report_storage_path TEXT,                   -- path di bucket "reports"
  report_uploaded_at  TIMESTAMPTZ,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX idx_orders_midtrans ON public.orders(midtrans_order_id);

-- RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User can read own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin can read all orders" ON public.orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );
CREATE POLICY "Admin can update orders" ON public.orders
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );
```

### 2.7 Tabel: `transactions`

Ledger pembayaran (immutable audit trail).

```sql
CREATE TYPE transaction_type AS ENUM (
  'order_payment',       -- bayar pesanan satuan
  'package_purchase',    -- beli paket hemat
  'referral_credit',     -- komisi referral masuk
  'credit_redemption'    -- kredit dipakai untuk diskon
);

CREATE TABLE public.transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id),
  type            transaction_type NOT NULL,
  amount_idr      INTEGER NOT NULL,           -- positif = masuk, negatif = keluar
  reference_id    UUID,                       -- order_id atau quota_package_id
  reference_type  TEXT,                       -- 'order' | 'quota_package'
  gateway_ref     TEXT,                       -- Midtrans transaction_id
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
```

### 2.8 Tabel: `referrals`

Tracking program referral.

```sql
CREATE TABLE public.referrals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id     UUID NOT NULL REFERENCES public.profiles(id),
  referred_id     UUID NOT NULL REFERENCES public.profiles(id),
  order_id        UUID REFERENCES public.orders(id),     -- first purchase
  commission_idr  INTEGER NOT NULL DEFAULT 0,
  is_credited     BOOLEAN NOT NULL DEFAULT false,
  credited_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(referrer_id, referred_id)
);
```

### 2.9 Tabel: `notifications`

Riwayat notifikasi in-app.

```sql
CREATE TYPE notification_channel AS ENUM ('in_app', 'whatsapp', 'email');

CREATE TABLE public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id    UUID REFERENCES public.orders(id),
  channel     notification_channel NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id, is_read);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User can read own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "User can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);
```

### 2.10 Tabel: `blog_posts` (opsional, bisa juga CMS eksternal)

```sql
CREATE TABLE public.blog_posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,
  title         TEXT NOT NULL,
  excerpt       TEXT,
  content       TEXT NOT NULL,              -- Markdown
  cover_image   TEXT,
  author_id     UUID REFERENCES public.profiles(id),
  is_published  BOOLEAN NOT NULL DEFAULT false,
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.11 Entity Relationship Diagram (Ringkasan)

```
auth.users ──── profiles ──────────────── user_quotas ──── quota_packages
                    │                                              │
                    │                                         services
                    │                                              │
                    ├──── uploaded_files                          │
                    │           │                                 │
                    ├──── orders ─────────────────────────────────┘
                    │       │
                    │       └──── transactions
                    │
                    ├──── referrals
                    └──── notifications
```

---

## 3. Supabase Storage Buckets

| Bucket | Visibilitas | Konten | Kebijakan Akses |
|---|---|---|---|
| `documents` | Private | File dokumen yang di-upload user | User hanya bisa upload ke path `{user_id}/`; hanya bisa read file milik sendiri; Admin bisa read semua |
| `reports` | Private | Laporan PDF hasil cek | Admin bisa upload; User hanya bisa access via signed URL (1 jam) yang di-generate server-side |
| `public-assets` | Public | Contoh laporan (dummy), logo, aset marketing | Public read |

### Storage Path Convention

```
documents/{user_id}/{order_id}/{original_filename}
reports/{order_id}/laporan.pdf
```

---

## 4. API Design

### 4.1 Konvensi

- Base URL: `/api/`
- Response format: `{ data, error, meta? }`
- Auth: Supabase JWT via cookie session (`createServerClient`)
- Error codes: standard HTTP + pesan deskriptif dalam Bahasa Indonesia

### 4.2 Endpoint: File Upload

```
POST /api/upload
Content-Type: multipart/form-data

Body:
  file: File

Auth: Required (user)

Response 200:
{
  "data": {
    "file_id": "uuid",
    "original_name": "skripsi.pdf",
    "file_size_bytes": 2048000,
    "page_count": 87
  }
}

Response 400:
{
  "error": "Format file tidak didukung. Gunakan PDF, DOCX, atau DOC."
}

Response 413:
{
  "error": "Ukuran file melebihi batas 50 MB."
}
```

### 4.3 Endpoint: Buat Pesanan

```
POST /api/order
Content-Type: application/json

Body:
{
  "file_id": "uuid",
  "service_slug": "plagiasi",
  "use_quota_id": "uuid | null"   // null = bayar satuan
}

Auth: Required (user)

Response 200 (pakai kuota):
{
  "data": {
    "order_id": "uuid",
    "order_number": "KLB-20260815-0042",
    "status": "diproses",
    "payment_method": "quota",
    "quota_remaining": 9
  }
}

Response 200 (bayar satuan):
{
  "data": {
    "order_id": "uuid",
    "order_number": "KLB-20260815-0043",
    "status": "menunggu_pembayaran",
    "payment_method": "midtrans",
    "snap_token": "xxx",
    "snap_redirect_url": "https://app.sandbox.midtrans.com/snap/..."
  }
}
```

### 4.4 Endpoint: Midtrans Webhook

```
POST /api/payment/webhook
Content-Type: application/json

Body: Midtrans notification object
  {
    "transaction_status": "settlement",
    "order_id": "KLB-20260815-0043",
    "gross_amount": "35000.00",
    "signature_key": "..."
  }

Auth: Verifikasi Midtrans signature (SHA-512)

Aksi:
1. Verifikasi signature_key
2. Cari order berdasarkan midtrans_order_id
3. Jika settlement/capture → update status ke 'dibayar' lalu 'diproses'
4. Catat transaksi di tabel transactions
5. Trigger notifikasi WA + email

Response 200: { "data": "ok" }
```

### 4.5 Endpoint: Download Laporan

```
GET /api/report/[id]

Auth: Required (user yang bersangkutan atau admin)

Aksi:
1. Cek kepemilikan order
2. Cek status = 'selesai'
3. Generate Supabase Storage signed URL (expire 3600s)
4. Redirect ke signed URL

Response 302: Redirect ke signed URL
Response 403: { "error": "Akses ditolak" }
Response 404: { "error": "Laporan belum tersedia" }
```

### 4.6 Endpoint: Notifikasi WhatsApp

```
POST /api/whatsapp/notify
Content-Type: application/json

Body:
{
  "order_id": "uuid",
  "event": "order_received" | "order_completed"
}

Auth: Internal only (service role key dari Edge Function)
```

### 4.7 Admin Endpoints

```
PATCH /api/admin/order/[id]
Body:
{
  "status": "diproses" | "selesai" | "dibatalkan",
  "admin_notes": "string",
  "cancel_reason": "string"
}

POST /api/admin/report/upload
Content-Type: multipart/form-data
Body:
  order_id: string
  report: File (PDF)

GET /api/admin/orders
Query params: status, service_id, page, limit, search
```

---

## 5. Middleware & Security

### 5.1 `middleware.ts`

```
Incoming Request
      │
      ├── /admin/* → cek role 'admin' atau 'super_admin', redirect /login jika tidak
      ├── /dashboard/* → cek auth JWT valid, redirect /login jika tidak
      ├── /api/upload → rate limit: 5 req/menit per user_id
      ├── /api/order → rate limit: 10 req/menit per user_id
      ├── /api/payment/webhook → bypass auth, verifikasi signature Midtrans
      └── /* (public) → lanjut
```

### 5.2 Row Level Security Summary

| Tabel | User | Admin |
|---|---|---|
| profiles | Read/update own | Read all |
| uploaded_files | Read own | Read all |
| orders | Read own | Read/update all |
| user_quotas | Read own | Read all |
| transactions | Read own | Read all |
| notifications | Read/update own | - |

---

## 6. Supabase Edge Functions

### 6.1 `expire-quota-checker` (Cron)

- **Jadwal:** Setiap hari pukul 00:00 WIB (17:00 UTC)
- **Fungsi:** Set `is_expired = true` pada `user_quotas` yang sudah melewati `expires_at`
- **Notifikasi:** Kirim WA/email ke user dengan kuota yang baru expired

### 6.2 `send-notification` (Event Trigger)

- **Trigger:** Perubahan kolom `status` di tabel `orders` (via Postgres trigger + `pg_notify`)
- **Fungsi:** Kirim notifikasi WhatsApp via Fonnte API dan email via Resend

### 6.3 `process-referral-credit` (Event Trigger)

- **Trigger:** Setelah transaksi `order_payment` atau `package_purchase` pertama dari referred user
- **Fungsi:** Hitung komisi, update `credit_balance` referrer, catat di `transactions`

---

## 7. Folder Structure Detail

```
kalibri/
├── app/
│   ├── (marketing)/
│   │   ├── page.tsx                    # Landing page (SSG)
│   │   ├── layanan/page.tsx            # Detail semua layanan
│   │   ├── blog/
│   │   │   ├── page.tsx                # Daftar artikel
│   │   │   └── [slug]/page.tsx         # Artikel detail (ISR)
│   │   ├── paket-hemat/page.tsx        # Halaman paket & pricing
│   │   └── referral/page.tsx           # Info program referral
│   │
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── daftar/page.tsx
│   │
│   ├── (dashboard)/
│   │   ├── layout.tsx                  # Sidebar nav + auth guard
│   │   ├── page.tsx                    # Dashboard home (ringkasan)
│   │   ├── cek-plagiasi/page.tsx       # Upload + order plagiasi
│   │   ├── cek-ai/page.tsx             # Upload + order AI detector
│   │   ├── cek-drillbit/page.tsx       # Upload + order DrillBit
│   │   ├── jasa-parafrase/page.tsx     # Upload + order parafrase
│   │   ├── riwayat-pesanan/page.tsx    # Order history + download
│   │   ├── paket-saya/page.tsx         # Saldo & kuota aktif
│   │   └── profil/page.tsx             # Profil + referral
│   │
│   ├── admin/
│   │   ├── layout.tsx                  # Admin sidebar + role guard
│   │   ├── page.tsx                    # Dashboard ringkasan
│   │   ├── pesanan/
│   │   │   ├── page.tsx                # Tabel semua pesanan
│   │   │   └── [id]/page.tsx           # Detail & proses pesanan
│   │   ├── users/page.tsx              # Manajemen user
│   │   ├── laporan/page.tsx            # Revenue & statistik
│   │   ├── layanan/page.tsx            # Konfigurasi harga layanan
│   │   └── paket/page.tsx              # Konfigurasi paket hemat
│   │
│   └── api/
│       ├── upload/route.ts
│       ├── order/route.ts
│       ├── payment/
│       │   └── webhook/route.ts
│       ├── report/[id]/route.ts
│       ├── whatsapp/notify/route.ts
│       └── admin/
│           ├── order/[id]/route.ts
│           └── report/upload/route.ts
│
├── components/
│   ├── ui/                             # shadcn/ui components
│   ├── landing/
│   │   ├── HeroSection.tsx
│   │   ├── ServicesGrid.tsx
│   │   ├── PricingTable.tsx
│   │   ├── TestimonialsSection.tsx
│   │   └── FAQSection.tsx
│   ├── dashboard/
│   │   ├── FileUploadZone.tsx          # Dropzone + progress
│   │   ├── OrderCard.tsx
│   │   ├── OrderStatusBadge.tsx
│   │   ├── QuotaBanner.tsx             # Warning saldo mau habis
│   │   ├── PaymentModal.tsx            # Midtrans SNAP embed
│   │   └── ReportDownloadButton.tsx
│   └── admin/
│       ├── OrderTable.tsx
│       ├── OrderDetailPanel.tsx
│       └── ReportUploadForm.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                   # createBrowserClient
│   │   └── server.ts                   # createServerClient (cookie)
│   ├── payment/
│   │   └── midtrans.ts                 # Midtrans SDK wrapper
│   ├── storage/
│   │   └── r2.ts                       # Cloudflare R2 (opsional alternatif)
│   ├── notification/
│   │   ├── whatsapp.ts                 # Fonnte API
│   │   └── email.ts                    # Resend API
│   ├── validators/
│   │   ├── upload.schema.ts            # Zod: file upload
│   │   ├── order.schema.ts             # Zod: order creation
│   │   └── admin.schema.ts             # Zod: admin actions
│   └── utils/
│       ├── format-currency.ts
│       ├── generate-order-number.ts
│       └── signed-url.ts
│
├── middleware.ts
│
├── supabase/
│   ├── migrations/
│   │   ├── 001_create_profiles.sql
│   │   ├── 002_create_services.sql
│   │   ├── 003_create_quota_packages.sql
│   │   ├── 004_create_user_quotas.sql
│   │   ├── 005_create_uploaded_files.sql
│   │   ├── 006_create_orders.sql
│   │   ├── 007_create_transactions.sql
│   │   ├── 008_create_referrals.sql
│   │   ├── 009_create_notifications.sql
│   │   └── 010_seed_services.sql
│   └── functions/
│       ├── expire-quota-checker/
│       │   └── index.ts
│       ├── send-notification/
│       │   └── index.ts
│       └── process-referral-credit/
│           └── index.ts
│
├── public/
│   ├── og-image.png
│   └── logo.svg
│
├── .env.local                          # Lihat bagian 8
└── next.config.js
```

---

## 8. Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # Server-only, jangan expose ke client

# Midtrans
MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=    # Untuk SNAP di client
MIDTRANS_IS_PRODUCTION=false        # 'true' di production

# Fonnte (WhatsApp)
FONNTE_API_KEY=
FONNTE_SENDER_NUMBER=

# Resend (Email)
RESEND_API_KEY=
RESEND_FROM_EMAIL=noreply@kalibri.id

# App
NEXT_PUBLIC_APP_URL=https://kalibri.id
NEXT_PUBLIC_APP_NAME=Kalibri

# Referral
REFERRAL_COMMISSION_PERCENT=10      # 10% dari nilai transaksi
```

---

## 9. Alur Pembelian Paket Hemat

```
User klik "Beli Paket" di halaman paket-hemat atau dashboard
      │
      ▼
POST /api/order (type: 'package_purchase')
  - Buat Midtrans transaction untuk harga paket
  - Return snap_token
      │
      ▼
Midtrans SNAP UI (modal)
      │
      ▼ (setelah bayar)
POST /api/payment/webhook
  - Verifikasi signature
  - Buat record user_quotas:
      quota_remaining = quota_total = package.quota_amount
      expires_at = now() + package.validity_days
  - Catat transaksi
  - Kirim notif konfirmasi
      │
      ▼
Dashboard user: kuota tampil di QuotaBanner
```

---

## 10. Keputusan Teknis & Trade-offs

| Keputusan | Pilihan | Alasan |
|---|---|---|
| Payment Gateway | Midtrans | Coverage bank Indonesia terlengkap, SNAP UI sudah matang |
| Storage Laporan | Supabase Storage | Terintegrasi RLS, tidak perlu infrastruktur tambahan. R2 bisa jadi alternatif untuk cost efficiency saat skala besar |
| Notifikasi WA | Fonnte | Affordable untuk volume rendah, mudah integrasi. Upgrade ke WA Business API saat volume tinggi |
| Email | Resend | Developer-friendly, generous free tier, React Email support |
| Pemrosesan Pesanan | Manual (fase 1) | Menghindari biaya API Turnitin/DrillBit di awal. Otomasi di fase 2 |
| Blog CMS | Postgres tabel `blog_posts` | Menghindari dependensi CMS eksternal di fase 1. Bisa migrasi ke Sanity/Contentful di fase 2 |
| Kuota per layanan | Satu paket = satu layanan | Mencegah kompleksitas cross-service quota, lebih mudah dipahami user |
| Order number format | `KLB-YYYYMMDD-XXXX` | Human-readable untuk komunikasi dengan user via WA |

---

## 11. Fase Pengembangan

### Fase 1 (MVP — 6 minggu)
- [ ] Setup Supabase + Auth + RLS
- [ ] Landing page + halaman layanan + pricing
- [ ] Autentikasi (email + Google OAuth)
- [ ] Upload dokumen + buat pesanan (satuan)
- [ ] Integrasi Midtrans
- [ ] Admin panel: antrian pesanan, upload laporan
- [ ] Notifikasi WA (Fonnte) + email (Resend)
- [ ] Riwayat pesanan + download laporan

### Fase 2 (4 minggu setelah MVP)
- [ ] Paket hemat + manajemen kuota
- [ ] Program referral
- [ ] Blog dengan ISR
- [ ] Dashboard admin: revenue, statistik
- [ ] Edge Function: expire-quota-checker (cron)

### Fase 3 (Future)
- [ ] Integrasi API otomasi (jika tersedia)
- [ ] Batch upload (beberapa file per transaksi)
- [ ] Mobile app (React Native / PWA)
- [ ] Reseller / mitra kampus
