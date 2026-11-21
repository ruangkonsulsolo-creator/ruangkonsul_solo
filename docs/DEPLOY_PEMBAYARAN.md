# Checklist Deploy: Pembayaran Langsung Katalog (Midtrans)

Ikuti berurutan. **Jangan merge ke `main` sebelum langkah 1–3 selesai** — tanpa tabel
baru dan `SUPABASE_SERVICE_ROLE_KEY`, endpoint pembayaran akan error di situs live.

## 1. Database (Supabase)
Migration 018–032 sudah ada di branch katalog Anda. Yang baru hanya:

- `supabase/migrations/033_pembayaran_produk_receipt.sql`
- `supabase/migrations/034_booking_bayar_midtrans.sql` (booking mentor dibayar via Midtrans; jalankan **setelah** 033)
- `supabase/migrations/035_paket_isi_saldo.sql` (paket isi saldo cek naskah + tarif per 1.000 kata dari DB; jalankan **setelah** 034)
- `supabase/migrations/036_pengerasan_rpc.sql` (keamanan: slot hanya oleh mentor pemilik/admin, biaya periksa minimum dihitung DB; jalankan **setelah** 035)
- `supabase/migrations/037_hitung_sesi_mentor.sql` (jumlah sesi mentor otomatis + nama profil akun Google; jalankan **setelah** 036)
- `supabase/migrations/038_registrasi_google.sql` (akun Google baru wajib lengkapi nama, password & WhatsApp; jalankan **setelah** 037)
- `supabase/migrations/039_kode_mentor.sql` (kode undangan mentor dari admin; jalankan **setelah** 038)
- `supabase/migrations/040_hero_slides.sql` (banner hero beranda dikelola admin + bucket gambar public-assets; jalankan **setelah** 039)
- `supabase/migrations/041_paket_promo_foto_mentor.sql` (slide Paket Layanan di beranda + izin mentor unggah foto; jalankan **setelah** 040)
- `supabase/migrations/042_cek_plagiarisme_manual.sql` (cek plagiarisme manual: layanan per berkas, kolom laporan, bucket documents & reports; jalankan **setelah** 041)

Cara menjalankan (pilih satu):
- **SQL Editor**: Supabase Dashboard → SQL Editor → tempel isi file 033 → Run, lalu file 034 → Run.
- **CLI**: `npx supabase db push` (hanya menjalankan migration yang belum tercatat).

Cek berhasil:
```sql
select count(*) from public.payments;         -- 0, tanpa error
select count(*) from public.pesanan_produk;   -- 0, tanpa error
select public.generate_receipt_number();      -- RCP-YYYYMMDD-XXXXXXXX
select column_name from information_schema.columns
 where table_name = 'bookings' and column_name = 'bayar_sebelum';  -- 1 baris (034)
```

Alur booking mentor (034): customer pilih mentor + jam di `/booking` → isi WhatsApp →
bayar (slot dikunci 60 menit) → lunas: booking `confirmed` + receipt; tidak dibayar:
dibatalkan otomatis dan slot muncul lagi. Daftar sesi customer: `/dashboard/sesi-saya`.

## 2. Environment Variables (Vercel → Project → Settings → Environment Variables)
| Nama | Nilai | Catatan |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` | **Rahasia**, jangan diberi awalan `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_APP_URL` | `https://ruangkonsul.id` | untuk link receipt & redirect Midtrans |
| `MIDTRANS_SERVER_KEY` | Midtrans → Settings → Access Keys | sandbox: `SB-Mid-server-…` |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | idem | sandbox: `SB-Mid-client-…` |
| `MIDTRANS_ENABLED_PAYMENTS` | `other_qris` (default, hanya QRIS) / `all` / mis. `other_qris,bca_va` | opsional |
| `MIDTRANS_SIGNATURE_KEY` | Access Keys → General Credentials → Signature Secret Key | opsional, untuk verifikasi webhook |
| `MIDTRANS_IS_PRODUCTION` | `false` (sandbox) / `true` (live) | |
| `NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION` | sama dengan di atas | |
| `NEXT_PUBLIC_ONGKIR_FLAT` | `15000` | hanya untuk produk ber-`berat_gram` |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | opsional | email receipt |

Setelah mengisi, **Redeploy** agar variabel `NEXT_PUBLIC_*` ikut ter-build.

## 3. Midtrans Dashboard
Settings → Payment → **Notification URL**:
```
https://ruangkonsul.id/api/payment/webhook
```
(Untuk uji di Preview Deployment Vercel, isi dengan URL preview-nya sementara.)

## 4. Uji di Preview Deployment (sebelum merge)
Vercel otomatis membuat Preview untuk Pull Request. Di URL preview:
1. Login sebagai customer → buka satu produk berharga pasti (mis. *Paket Daily Bimbingan Online Judul + Outline*).
2. Isi WhatsApp → **Bayar Sekarang** → bayar dengan simulator sandbox:
   https://simulator.sandbox.midtrans.com (QRIS / VA BCA).
3. Harus otomatis pindah ke halaman **Receipt** berstatus LUNAS, ada tombol **Konfirmasi via WhatsApp**.
4. Admin → **Pesanan Produk**: pesanan muncul berstatus *Lunas* → coba **Proses** → **Selesai**.
5. Buka `/verify/<nomor receipt>` di jendela incognito → "Receipt Valid".

## 5. Merge
Jika langkah 4 lolos: merge Pull Request ke `main` → Vercel deploy production.

## 6. Go-live (uang sungguhan)
- Selesaikan aktivasi akun Midtrans Production (KTP/NPWP atau dokumen badan usaha).
- Ganti key ke **Production**, set `MIDTRANS_IS_PRODUCTION=true` dan `NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION=true`, redeploy.
- Notification URL di dashboard **Production** juga harus diisi (sandbox & production terpisah).

## Aturan checkout katalog
| Kondisi produk | Tombol |
|---|---|
| `harga > 0` dan `harga_mulai = false` | **Bayar Sekarang** (Midtrans) → receipt → Konfirmasi via WhatsApp |
| `harga_mulai = true` atau `harga = 0` | **Konsultasi harga via WhatsApp** (harga belum final) |
| `stok = 0` | Stok habis → tanya ketersediaan via WhatsApp |
| `berat_gram` terisi | Form alamat + ongkir flat |
| `stok` terisi | Stok dipesan saat checkout, dikembalikan otomatis jika pembayaran expire |
