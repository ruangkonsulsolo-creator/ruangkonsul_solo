# Kalibri — Requirements Document

> Platform SaaS untuk jasa cek plagiasi, AI detector, DrillBit checker, dan parafrase bagi mahasiswa Indonesia.

**Versi:** 1.0  
**Tanggal:** 15 Agustus 2026  
**Stack:** Next.js 14 App Router · TypeScript · Tailwind CSS · shadcn/ui · Supabase (Auth, Postgres, Storage)

---

## 1. Gambaran Umum

Kalibri adalah platform berbasis web yang menyediakan empat layanan pemrosesan dokumen akademik:

| Layanan | Deskripsi |
|---|---|
| **Cek Plagiasi** | Deteksi kemiripan teks dengan laporan persentase (Turnitin-like) |
| **AI Detector** | Identifikasi proporsi teks yang ditulis oleh AI |
| **DrillBit Checker** | Cek plagiasi menggunakan mesin DrillBit (digunakan kampus-kampus Indonesia) |
| **Jasa Parafrase** | Penulisan ulang dokumen secara manual/semi-otomatis oleh tim Kalibri |

Model bisnis: **bayar per file** (pay-per-use) dan **paket hemat** (bundle kuota). Tidak ada langganan bulanan.

---

## 2. Stakeholders & Peran

| Peran | Deskripsi |
|---|---|
| **Guest** | Pengunjung belum login — bisa lihat landing page dan pricing |
| **User** | Mahasiswa/pengguna terdaftar — bisa upload dokumen dan beli layanan |
| **Admin** | Operator internal Kalibri — memproses pesanan dan upload laporan |
| **Super Admin** | Akses penuh: manajemen admin, konfigurasi harga, laporan keuangan |

---

## 3. Functional Requirements

### 3.1 Landing Page & Marketing

| ID | Requirement |
|---|---|
| FR-M01 | Tampilkan hero section dengan value proposition dan CTA utama |
| FR-M02 | Tampilkan daftar layanan (Plagiasi, AI, DrillBit, Parafrase) dengan penjelasan singkat |
| FR-M03 | Tampilkan pricing per-file untuk setiap layanan |
| FR-M04 | Tampilkan halaman **Paket Hemat** dengan tabel perbandingan paket (10x/25x/50x) |
| FR-M05 | Tampilkan halaman **Layanan** dengan detail SLA, format file yang didukung, dan contoh laporan |
| FR-M06 | Tampilkan halaman **Blog** dengan artikel SEO; support slug dinamis |
| FR-M07 | Tampilkan halaman **Referral** — user bisa lihat kode referral dan histori komisi |
| FR-M08 | Semua halaman marketing responsive dan SEO-friendly (meta tags, OG, sitemap) |

### 3.2 Autentikasi

| ID | Requirement |
|---|---|
| FR-A01 | User bisa daftar dengan email + password |
| FR-A02 | User bisa login dengan email + password |
| FR-A03 | User bisa login dengan Google OAuth (via Supabase Auth) |
| FR-A04 | Verifikasi email wajib sebelum bisa melakukan pesanan |
| FR-A05 | Reset password via email |
| FR-A06 | Session dikelola Supabase JWT; middleware guard semua route `/dashboard` dan `/admin` |

### 3.3 Dashboard User

#### 3.3.1 Upload & Pemesanan

| ID | Requirement |
|---|---|
| FR-D01 | User bisa upload dokumen (PDF, DOCX, DOC) maksimal 50 MB per file |
| FR-D02 | Setelah upload, user memilih jenis layanan yang diinginkan |
| FR-D03 | Sistem menghitung harga (satuan atau dari saldo paket) dan menampilkan ringkasan pesanan |
| FR-D04 | Jika user punya saldo paket aktif yang sesuai layanan, pesanan langsung memotong kuota |
| FR-D05 | Jika tidak ada kuota, user diarahkan ke halaman pembayaran (Midtrans) |
| FR-D06 | Setelah pembayaran konfirmasi, pesanan otomatis masuk antrian admin |
| FR-D07 | User menerima notifikasi WhatsApp/email saat pesanan diterima dan selesai |

#### 3.3.2 Riwayat Pesanan

| ID | Requirement |
|---|---|
| FR-D08 | User bisa melihat semua pesanan dengan status: `menunggu_pembayaran`, `diproses`, `selesai`, `dibatalkan` |
| FR-D09 | User bisa filter pesanan berdasarkan status, tanggal, dan jenis layanan |
| FR-D10 | User bisa download laporan PDF hasil cek (hanya untuk pesanan berstatus `selesai`) |
| FR-D11 | Laporan memiliki link download yang expire setelah 1 jam (signed URL Supabase Storage / R2) |

#### 3.3.3 Paket Hemat & Kuota

| ID | Requirement |
|---|---|
| FR-D12 | User bisa membeli paket hemat dari halaman dashboard atau marketing |
| FR-D13 | Saldo kuota tampil di dashboard: sisa kuota, layanan yang dicakup, tanggal kedaluwarsa |
| FR-D14 | Kuota terdekat kedaluwarsa ditampilkan dengan warning banner |
| FR-D15 | Jika paket kedaluwarsa, sisa kuota hangus (tidak ada refund) — ditampilkan jelas di ToS |

#### 3.3.4 Profil & Referral

| ID | Requirement |
|---|---|
| FR-D16 | User bisa update nama, nomor WhatsApp, dan password |
| FR-D17 | User bisa lihat kode referral unik miliknya |
| FR-D18 | User mendapat kredit/diskon saat referral-nya melakukan pembelian pertama |

### 3.4 Sistem Pembayaran

| ID | Requirement |
|---|---|
| FR-P01 | Integrasi Midtrans Payment Gateway (SNAP atau Core API) |
| FR-P02 | Mendukung metode bayar: transfer bank (VA), QRIS, GoPay, OVO, ShopeePay, kartu kredit |
| FR-P03 | Webhook Midtrans memperbarui status pesanan secara otomatis |
| FR-P04 | Jika pembayaran gagal/expired, pesanan otomatis dibatalkan dan file dihapus |
| FR-P05 | Invoice otomatis dikirim ke email user setelah pembayaran berhasil |
| FR-P06 | Sistem referral: komisi (%) dikreditkan ke saldo kredit referrer setelah pembayaran selesai |

### 3.5 Admin Panel

| ID | Requirement |
|---|---|
| FR-ADM01 | Admin bisa lihat semua pesanan masuk (tabel dengan filter & search) |
| FR-ADM02 | Admin bisa mengunduh file dokumen yang di-upload user |
| FR-ADM03 | Admin bisa upload laporan hasil cek (PDF) ke pesanan tertentu |
| FR-ADM04 | Admin bisa mengubah status pesanan: `diproses` → `selesai` atau `dibatalkan` |
| FR-ADM05 | Setelah admin set `selesai`, sistem otomatis kirim notifikasi ke user |
| FR-ADM06 | Admin bisa lihat daftar user, saldo kuota, dan riwayat transaksi |
| FR-ADM07 | Super Admin bisa tambah/nonaktifkan akun admin |
| FR-ADM08 | Super Admin bisa konfigurasi harga per layanan dan paket hemat dari panel |
| FR-ADM09 | Admin panel tersedia di `/admin/*` dengan guard role-based |
| FR-ADM10 | Dashboard admin menampilkan ringkasan: total pesanan hari ini, revenue, pesanan pending |

### 3.6 Notifikasi

| ID | Requirement |
|---|---|
| FR-N01 | Notifikasi WhatsApp via Fonnte/WA Business API: pesanan masuk, pesanan selesai |
| FR-N02 | Notifikasi email via Resend/SMTP: konfirmasi pesanan, invoice, laporan siap diunduh |
| FR-N03 | Notifikasi in-app (toast/badge) saat user membuka dashboard |

---

## 4. Non-Functional Requirements

| ID | Requirement | Target |
|---|---|---|
| NFR-01 | **Performance** | Halaman marketing TTFB < 200ms (SSG/ISR), dashboard < 500ms |
| NFR-02 | **Availability** | Uptime 99.5% (Vercel + Supabase managed) |
| NFR-03 | **Security** | Auth via Supabase JWT; file upload hanya bisa diakses pemilik + admin (RLS Supabase) |
| NFR-04 | **File Security** | File dokumen disimpan di private bucket; URL hanya via signed link |
| NFR-05 | **Skalabilitas** | Stateless API routes; job pemrosesan via Supabase Edge Functions / queue |
| NFR-06 | **Compliance** | Data pengguna diproses di server region Asia (Singapore) |
| NFR-07 | **Rate Limiting** | API upload dibatasi 5 req/menit per user via middleware |
| NFR-08 | **Aksesibilitas** | Minimum WCAG 2.1 AA untuk halaman utama |
| NFR-09 | **SEO** | Landing page menggunakan Next.js metadata API; structured data untuk layanan |
| NFR-10 | **Mobile** | Semua halaman fully responsive, terutama dashboard dan checkout flow |

---

## 5. User Stories

### Guest
- Sebagai guest, saya ingin melihat harga per layanan agar bisa mempertimbangkan biaya sebelum daftar.
- Sebagai guest, saya ingin melihat contoh laporan plagiasi agar tahu kualitas output Kalibri.
- Sebagai guest, saya ingin daftar akun dengan email atau Google agar bisa mulai menggunakan layanan.

### User
- Sebagai user, saya ingin mengupload skripsi saya dan memilih cek plagiasi agar tahu persentase kemiripannya.
- Sebagai user, saya ingin membeli paket 25x cek agar lebih hemat dibandingkan bayar satuan.
- Sebagai user, saya ingin melihat sisa kuota paket saya agar tahu kapan perlu beli ulang.
- Sebagai user, saya ingin download laporan hasil cek kapan saja selama link aktif.
- Sebagai user, saya ingin mendapat notifikasi WhatsApp saat laporan sudah siap agar tidak harus terus refresh.
- Sebagai user, saya ingin melihat riwayat semua pesanan saya dengan filter agar mudah mencari laporan lama.
- Sebagai user, saya ingin berbagi kode referral kepada teman agar mendapat diskon pembelian berikutnya.

### Admin
- Sebagai admin, saya ingin melihat semua pesanan masuk agar bisa memprioritaskan antrian.
- Sebagai admin, saya ingin mengunduh file dokumen user agar bisa melakukan proses cek di tools eksternal.
- Sebagai admin, saya ingin mengupload laporan PDF hasil cek agar user bisa mengunduhnya.
- Sebagai admin, saya ingin mengubah status pesanan agar user dan sistem terupdate.

### Super Admin
- Sebagai super admin, saya ingin mengubah harga layanan tanpa deploy ulang agar fleksibel menyesuaikan pasar.
- Sebagai super admin, saya ingin melihat total revenue harian/bulanan agar bisa membuat keputusan bisnis.

---

## 6. Format File yang Didukung

| Layanan | Format Input | Output Laporan |
|---|---|---|
| Cek Plagiasi | PDF, DOCX, DOC (max 50 MB) | PDF (laporan kemiripan + highlight) |
| AI Detector | PDF, DOCX, DOC (max 50 MB) | PDF (skor AI per paragraf) |
| DrillBit Checker | PDF, DOCX (max 20 MB) | PDF (laporan DrillBit resmi) |
| Jasa Parafrase | PDF, DOCX, DOC (max 50 MB) | DOCX (dokumen terparafrase) |

---

## 7. Pricing Model (Contoh — Dapat Dikonfigurasi Admin)

### Per-File (Satuan)

| Layanan | Harga |
|---|---|
| Cek Plagiasi | Rp 3.000 |
| AI Detector | Rp 5.000 |
| DrillBit Checker | Rp 6.000 |
| Jasa Parafrase | Rp 25.000 – Rp 150.000 (per halaman) |

### Paket Hemat

| Paket | Kuota | Layanan | Harga | Masa Aktif | Harga/Cek |
|---|---|---|---|---|---|
| Starter | 10x | Plagiasi | Rp 299.000 | 30 hari | Rp 29.900 |
| Popular | 25x | Plagiasi | Rp 625.000 | 60 hari | Rp 25.000 |
| Pro | 50x | Plagiasi | Rp 1.100.000 | 90 hari | Rp 22.000 |
| AI Starter | 10x | AI Detector | Rp 199.000 | 30 hari | Rp 19.900 |
| AI Pro | 25x | AI Detector | Rp 450.000 | 60 hari | Rp 18.000 |

> Paket bisa ditambah/dikonfigurasi oleh Super Admin dari panel.

---

## 8. Batasan & Asumsi

- **Pemrosesan manual:** Tahap pertama, semua cek dilakukan **manual** oleh tim admin menggunakan tools eksternal (Turnitin institusi, DrillBit, dll). Otomasi API bisa ditambahkan di fase berikutnya.
- **Satu pesanan = satu file.** Tidak ada batch upload per transaksi (bisa ditambah di fase 2).
- **Refund policy:** Tidak ada refund setelah pembayaran dikonfirmasi dan admin mulai proses. Admin bisa batalkan jika file corrupt.
- **Bahasa:** UI dalam Bahasa Indonesia. Laporan output bisa dalam format mesin (Bahasa Inggris/Indonesia).
- **Integrasi payment:** Midtrans sebagai primary payment gateway karena coverage bank Indonesia terluas.
- **Notifikasi:** WhatsApp via Fonnte (affordable) sebagai primary channel; email sebagai secondary.

---

## 9. Out of Scope (Fase 1)

- Integrasi API Turnitin/DrillBit langsung (pemrosesan masih manual)
- Mobile app (iOS/Android)
- Fitur chat support real-time
- Multi-bahasa (hanya Bahasa Indonesia)
- Marketplace reseller
