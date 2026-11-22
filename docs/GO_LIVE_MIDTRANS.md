# Checklist Go-Live (Midtrans Production)

Urutan kerja dari mode uji (Sandbox) sampai menerima uang sungguhan.
Centang satu per satu. Semua yang ditandai **[kode]** sudah selesai di repo.

## A. Uji semua alur di Sandbox (tanpa uang sungguhan)

Pembayaran Sandbox tidak bisa dibayar dengan e-wallet asli. Pakai **simulator**:

1. Di website, klik tombol bayar → muncul QRIS Midtrans (Sandbox).
2. Salin/unduh gambar QR, atau salin URL QR yang tampil.
3. Buka **https://simulator.sandbox.midtrans.com** → pilih **QRIS** → tempel URL/gambar QR → **Pay**.
4. Website otomatis berubah status menjadi **Lunas** (webhook) dalam beberapa detik.

Alur yang wajib dicoba (masing-masing sekali):

| Alur | Yang harus terjadi |
|---|---|
| Cek AI (saldo kurang → QRIS) | setelah bayar, pemeriksaan jalan otomatis; tombol **Unduh Laporan ZeroGPT (PDF)** |
| Parafrase | hasil keluar 1–5 menit; unduh Word |
| Cek Plagiasi, **2–3 file sekaligus** | satu QRIS; semua file muncul di Admin → Cek Turnitin & DrillBit |
| Admin unggah laporan + similarity → Kirim | status customer **Selesai**, skor & tombol unduh; WA "laporan siap" |
| Booking mentor | slot terkunci, lunas → sesi terkonfirmasi, chat mentor muncul |
| Produk katalog | receipt lunas; admin proses → kirim (resi) → selesai |
| Isi saldo | saldo bertambah sesuai paket |
| QRIS dibiarkan kedaluwarsa | pesanan otomatis **Dibatalkan** (multi-file: semua file ikut batal) |
| Referral | akun baru dari link `?ref=` → bayar pertama → komisi 10% masuk saldo pengajak |

## B. Siapkan pengajuan akun Production

Di dashboard Midtrans → **Settings → Business Profile / Aktivasi**. Lengkapi sesuai yang diminta
(jenis dokumen tergantung perorangan atau badan usaha), umumnya:

- [ ] Identitas pemilik (KTP) dan NPWP (bila ada)
- [ ] Rekening bank **atas nama pemilik usaha / badan usaha** untuk pencairan
- [ ] Deskripsi usaha: jasa bimbingan akademik, cek naskah, produk edukasi
- [ ] URL website aktif dengan halaman berikut (sudah ada **[kode]**):
  - Syarat & Ketentuan — `/syarat`
  - Kebijakan Refund — `/kebijakan-refund`
  - Kebijakan Privasi — `/kebijakan-privasi`
  - Kontak (alamat, email, WhatsApp) — `/kontak`
- [ ] Harga tampil jelas di halaman layanan **[kode]**
- [ ] Sebaiknya pakai domain sendiri (**ruangkonsul.id**) saat pengajuan, bukan alamat `vercel.app`

Proses verifikasi dilakukan Midtrans; lamanya tergantung kelengkapan dokumen.

## C. Setelah disetujui — pindah ke Production

1. Midtrans dashboard: pindahkan mode ke **Production** (pojok kiri atas).
2. **Settings → Access Keys** (Production): salin Server Key & Client Key.
3. **Settings → Payment → Notification URL** (Production — terpisah dari Sandbox):
   ```
   https://ruangkonsul.id/api/payment/webhook
   ```
4. Vercel → Environment Variables (Production), lalu **Redeploy**:

   | Key | Nilai |
   |---|---|
   | `MIDTRANS_SERVER_KEY` | Server Key Production (`Mid-server-…`, tanpa `SB-`) |
   | `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | Client Key Production (`Mid-client-…`) |
   | `MIDTRANS_IS_PRODUCTION` | `true` |
   | `NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION` | `true` |
   | `NEXT_PUBLIC_APP_URL` | `https://ruangkonsul.id` |

5. **Uji sungguhan sekali** dengan nominal kecil (mis. isi saldo termurah / Cek AI minimum Rp5.000)
   memakai e-wallet sendiri → pastikan status Lunas, receipt, dan notifikasi WA.

## D. Sebelum promosi

- [ ] Tarif Cek AI dicek di Admin → Tarif Pemeriksaan (ZeroGPT ±Rp756/1.000 kata;
      Rp1.000 = margin ±24%, Rp1.500 = margin ±50%)
- [ ] Saldo ZeroGPT cukup; Auto Recharge sesuai kebutuhan
- [ ] Device Fonnte **Connected**; nomor notifikasi sudah "dihangatkan"
- [ ] Cron harian terlihat di Vercel → Settings → Cron Jobs
- [ ] Rotasi kunci yang pernah terlihat di chat/screenshot (Supabase service key, ZeroGPT, dsb.)
- [ ] Ganti angka kebijakan (jam layanan, batas refund) bila berbeda dari usulan
