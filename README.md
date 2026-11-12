# PT Zamzameena Ainsa Synergy

Company profile PT Zamzameena Ainsa Synergy menggunakan Next.js App Router. Halaman Home, About, dan Contact menggunakan komponen Next.js. Halaman `/management/struktur` mengambil konten dari template HTML `struktur.html`.

## Menjalankan aplikasi Next.js

- Jalankan `npm install`, lalu `npm run dev`.
- Buka `http://localhost:3000`. Halaman tersedia di `/`, `/about`, `/business`, `/product-knowledge`, `/our-strength`, dan `/contact`.
- Project Next.js tetap menggunakan struktur App Router, sehingga dapat dibangun dengan `npm run build` dan dideploy ke Vercel.
- Konten halaman `/management/struktur` bersumber dari body `struktur.html` yang dirender di dalam layout Next.js.
- Gaya halaman berbasis template berada di `css/style.css`. Script browser aktif dimuat dari `public/js/main.js`.

## Mengganti foto dan logo

- Foto untuk halaman `/management/struktur` dapat disimpan sebagai `struktur.jpg` di `public/photos/`. Gunakan foto yang sesuai dengan deskripsi `alt` di template; bila gambar gagal dimuat, halaman menampilkan ilustrasi SVG cadangan.
- Logo untuk template tersedia di `public/assets/logo.png`; `public/assets/logo.svg` menjadi favicon dan fallback lokal.

## Setup Database

The contact form database backend is not configured yet. Create a PostgreSQL database using Neon or Supabase, then copy its connection string into a new `.env` file in the project root as `DATABASE_URL="..."`. For local PostgreSQL, use the connection string for your local database. Use `.env.example` as a format reference; do not commit `.env`.

## Mengubah informasi

- Nomor dan pesan awal WhatsApp ada pada konstanta `WHATSAPP_NUMBER` dan `DEFAULT_WHATSAPP_MESSAGE` di awal `public/js/main.js` (format internasional tanpa tanda `+` atau spasi).
- Informasi kontak halaman Contact dikelola di `lib/contact-info.ts`.
- Bagan organisasi berada dalam array `ORGANIZATION` di awal `public/js/main.js`; ubah nama divisi atau daftar unit di sana.
- Warna dan font situs dikelola dari variabel di awal `css/style.css`. Mode siang (latar terang) tampil sebagai default; tombol bulan beralih ke mode malam (latar gelap). Pilihan tidak disimpan dan selalu kembali ke mode siang ketika halaman dimuat ulang.
- WhatsApp dapat dibuka dari sidebar dan bagian kontak. Tidak ada tombol WhatsApp mengambang.
