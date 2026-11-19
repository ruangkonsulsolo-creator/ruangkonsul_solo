# Setup Pembayaran Midtrans & Role

## 1. Database
Jalankan migration terbaru (`018_payments_and_role_fixes.sql` dan `019_receipts_merch_processing_security.sql`):

```bash
npx supabase db push
```

Atau buka Supabase → SQL Editor dan jalankan isi file tersebut.

> Catatan: `014_orders_add_detection_fields.sql` memakai nilai enum baru di
> statement yang sama. Jika `db push` gagal di file itu, jalankan 014 lewat
> SQL Editor (di luar transaksi), lalu ulangi `db push`.

Jadikan akun pertama sebagai superadmin (SQL Editor):

```sql
update public.profiles set role = 'superadmin'
where id = (select id from auth.users where email = 'email-anda@contoh.com');
```

Setelah itu role user lain diatur dari **Admin → Users** (hanya superadmin).

## 2. Environment
Salin `.env.example` → `.env.local` (lokal) atau isi di Vercel → Environment Variables.
Yang wajib: `SUPABASE_SERVICE_ROLE_KEY`, `MIDTRANS_SERVER_KEY`,
`NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`, `NEXT_PUBLIC_APP_URL`.

`NEXT_PUBLIC_PREVIEW_MODE` sekarang default **mati** → login & guard role aktif.

## 3. Midtrans Dashboard
Settings → Payment → Notification URL:

```
https://<domain-anda>/api/payment/webhook
```

Finish/Unfinish/Error redirect boleh dikosongkan (sudah diatur per transaksi).

## 4. Alur pembayaran
| Jenis | Endpoint | Setelah lunas (webhook) |
|---|---|---|
| Pesanan per-file | `POST /api/order` | order → `diproses`, notifikasi, pipeline deteksi |
| Paket hemat | `POST /api/payment/package` | `user_quotas` dibuat sesuai paket |
| Booking mentor | `POST /api/payment/booking` | booking → `confirmed`, notifikasi customer & mentor |
| Merchandise | `POST /api/payment/merch` | pesanan → `dibayar` (stok sudah direservasi saat checkout) |

**Wajib WhatsApp:** pesanan layanan, booking bimbingan, dan merch ditolak server
(`WHATSAPP_REQUIRED`) jika nomor WA belum valid. Nomor yang diisi di form otomatis tersimpan ke profil.

**Receipt:** setiap pembayaran lunas otomatis mendapat nomor `RCP-YYYYMMDD-XXXXXXXX`
(trigger DB). Customer: **Dashboard → Receipt** (lihat, cetak, unduh PDF). Siapa pun bisa
memverifikasi keasliannya di `/verify/<nomor>` (hanya data minimal, nama disamarkan).

Semua tercatat di tabel `payments` (lihat **Admin → Pembayaran**).
Pembayaran expire/batal: pesanan dibatalkan + file dihapus, slot booking dibuka lagi.
Komisi referral dikreditkan otomatis pada pembelian berbayar pertama user yang diajak.

Jika webhook belum bisa menjangkau server (mis. localhost), status tetap
tersinkron: browser memanggil `POST /api/payment/status` setelah popup Snap
ditutup, dan admin bisa klik **Cek** di halaman Pembayaran.

## 5. Uji di sandbox
Gunakan simulator Midtrans: https://simulator.sandbox.midtrans.com
(QRIS / VA BCA / GoPay). Kartu uji: `4811 1111 1111 1114`, CVV `123`, OTP `112233`.

## 6. Ringkasan role
| Role | Akses |
|---|---|
| user | dashboard, pesan & bayar, beli paket, booking mentor, ulasan |
| mentor | `/mentor`: profil & tarif, jadwal/slot, klien, tandai sesi selesai, link meeting |
| admin | `/admin`: pesanan, pembayaran, users (lihat), konten, booking leads |
| superadmin | semua admin + harga layanan, paket, ubah role / nonaktifkan akun |


## 7. Engine layanan otomatis
| Layanan | Cara kerja | Output |
|---|---|---|
| Cek Plagiasi (similarity) | Dokumen dipecah per paragraf, dibandingkan frasa 4–5 kata dengan: repositori internal (fingerprint dokumen yang pernah dicek, tanpa menyimpan teks), OpenAlex (±250 jt publikasi ilmiah), dan Google via Serper (opsional) | Skor %, sumber, laporan PDF |
| AI Detector | Claude (model bahasa) + analisis stilometri per segmen; tanpa `ANTHROPIC_API_KEY` tetap jalan dengan stilometri saja | Skor % per segmen, laporan PDF |
| Parafrase | Claude menulis ulang per paragraf, menjaga istilah, angka & sitasi; daftar pustaka tidak diubah | File `.docx` + laporan perbandingan PDF |
| DrillBit | Tetap manual — admin mengunggah laporan resmi DrillBit | PDF dari admin |

- Diproses di background setelah pembayaran/kuota. Cadangan: Vercel Cron `/api/cron/process`
  tiap 5 menit (`vercel.json`, butuh `CRON_SECRET`; paket Hobby Vercel hanya mendukung cron harian —
  di Hobby, halaman layanan customer otomatis memicu proses jika macet).
- Gagal → dicoba ulang maks 3x; admin bisa klik **Proses ulang otomatis** di detail pesanan.
- File `.doc` lama dan PDF hasil scan tidak bisa diproses otomatis → ditandai untuk admin.
- Butuh fungsi serverless dengan durasi panjang (`maxDuration = 300`, paket Vercel Pro) untuk dokumen besar.

## 8. Login Google
Kode sudah siap; aktifkan di dashboard:
1. Google Cloud Console → APIs & Services → Credentials → **Create OAuth client ID** (Web application).
   - Authorized JavaScript origins: `https://<domain-anda>`
   - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
2. OAuth consent screen: isi nama aplikasi, logo, domain, email support; publish ke **Production**.
3. Supabase → Authentication → Providers → **Google**: aktifkan, tempel Client ID & Secret.
4. Supabase → Authentication → URL Configuration:
   - Site URL: `https://<domain-anda>`
   - Redirect URLs: `https://<domain-anda>/auth/callback` (tambahkan juga `http://localhost:3000/auth/callback` untuk dev)

User Google belum punya nomor WA → otomatis diminta saat checkout pertama.

## 9. Keamanan (sudah aktif di kode)
- Security headers: CSP (mengizinkan Midtrans Snap & Supabase), HSTS, X-Frame-Options, nosniff,
  Referrer-Policy, Permissions-Policy. Uji dulu dengan `CSP_REPORT_ONLY=true` jika ragu.
- Rate limit berbasis DB (tabel `rate_limits`) di order, pembayaran, upload, booking lead, verifikasi receipt.
- Upload langsung ke Supabase Storage via signed URL (mendukung file 50 MB) + verifikasi magic bytes.
- RLS: user tidak bisa mengubah role/saldo/referral sendiri; semua tulis data finansial lewat server.
- Redirect `next=` divalidasi (anti open-redirect), callback OAuth menolak akun nonaktif.

Rekomendasi di dashboard Supabase (tidak bisa dari kode):
- Authentication → **Confirm email** = ON; **Leaked password protection** = ON; panjang password min 8.
- Authentication → **Rate limits**: biarkan default atau perketat.
- Aktifkan **CAPTCHA** (Cloudflare Turnstile) di Authentication → Attack Protection bila ada spam pendaftaran.
- Pastikan bucket `documents` & `reports` **privat** (migration 019 sudah mengatur).
