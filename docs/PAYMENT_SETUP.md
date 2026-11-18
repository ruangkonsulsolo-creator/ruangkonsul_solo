# Setup Pembayaran Midtrans & Role

## 1. Database
Jalankan migration terbaru (`018_payments_and_role_fixes.sql`):

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
