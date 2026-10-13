# PT Zamzameena Ainsa Synergy

Company profile PT Zamzameena Ainsa Synergy menggunakan Next.js App Router. Halaman Home dan About memakai desain Next.js terkini. Halaman `/our-strength` dan `/contact` mengambil konten dari template HTML `struktur.html` dan `hubungi.html`.

## Menjalankan aplikasi Next.js

- Jalankan `npm install`, lalu `npm run dev`.
- Buka `http://localhost:3000`. Halaman tersedia di `/`, `/about`, `/business`, `/product-knowledge`, `/our-strength`, dan `/contact`.
- Project Next.js tetap menggunakan struktur App Router, sehingga dapat dibangun dengan `npm run build` dan dideploy ke Vercel.
- Konten halaman `/our-strength` dan `/contact` bersumber dari body `struktur.html` dan `hubungi.html`; keduanya dirender di dalam layout Next.js.
- Gaya halaman berbasis template berada di `css/style.css`. Script browser aktif dimuat dari `public/js/main.js`.

## Mengganti foto dan logo

- Foto untuk halaman `/our-strength` dan `/contact` dapat disimpan sebagai `struktur.jpg` dan `hubungi.jpg` di `public/photos/`. Gunakan foto yang sesuai dengan deskripsi `alt` di template; bila gambar gagal dimuat, halaman menampilkan ilustrasi SVG cadangan.
- Logo untuk template tersedia di `public/assets/logo.png`; `public/assets/logo.svg` menjadi favicon dan fallback lokal.

## Mengubah informasi

- Nomor dan pesan awal WhatsApp ada pada konstanta `WHATSAPP_NUMBER` dan `DEFAULT_WHATSAPP_MESSAGE` di awal `public/js/main.js` (format internasional tanpa tanda `+` atau spasi).
- Ubah nama, alamat, email, nomor telepon, kalimat, dan teks tombol langsung pada HTML yang sesuai.
- Bagan organisasi berada dalam array `ORGANIZATION` di awal `public/js/main.js`; ubah nama divisi atau daftar unit di sana.
- Warna dan font situs dikelola dari variabel di awal `css/style.css`. Mode siang (latar terang) tampil sebagai default; tombol bulan beralih ke mode malam (latar gelap). Pilihan tidak disimpan dan selalu kembali ke mode siang ketika halaman dimuat ulang.
- WhatsApp dapat dibuka dari sidebar dan bagian kontak. Tidak ada tombol WhatsApp mengambang.
