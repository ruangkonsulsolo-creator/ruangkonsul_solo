Foto produk merchandise.

Tiap produk punya satu subfolder, namanya sama persis dengan `slug` produk
di lib/merchandise/katalog.ts. Folder untuk produk yang sudah ada sudah
dibuatkan di sini.

  Ukuran:  1000 x 1000 piksel (persegi, seperti Shopee)
  Format:  .jpg, .jpeg, .png, .webp, .avif
  Berkas:  usahakan di bawah 200 KB per foto
  Nama:    1.jpg, 2.jpg, 3.jpg  — urutan mengikuti nama berkas,
           dan foto nomor 1 jadi gambar utama di katalog

Tidak ada kode yang perlu diubah: folder ini dipindai sendiri saat build.
Berkas non-gambar seperti README.txt diabaikan.

Setelah menambah produk baru di katalog.ts, buat folder baru di sini dengan
nama slug produk itu.

Pemindaian terjadi saat build. Setelah menambah foto, jalankan ulang
`npm run dev` atau `npm run build` supaya terbaca.
