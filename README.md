# PT Zamzameena Ainsa Synergy

Company profile PT Zamzameena Ainsa Synergy tersedia sebagai aplikasi Next.js untuk deployment utama dan versi HTML, CSS, serta JavaScript murni untuk preview statis.

## Menjalankan aplikasi Next.js

- Jalankan `npm install`, lalu `npm run dev`.
- Buka `http://localhost:3000`. Halaman utama dan desain baru juga tersedia di `/about`, `/our-strength`, dan `/contact`.
- Project Next.js tetap menggunakan struktur App Router, sehingga dapat dibangun dengan `npm run build` dan dideploy ke Vercel.
- Desain baru menggunakan `css/style.css` dan `js/main.js`; salinan script dan logo untuk Next.js berada di `public/js/` dan `public/assets/`.

## Preview HTML statis

- Buka `index.html` langsung di browser, atau jalankan Live Server dari folder project.
- Semua halaman dapat dibuka lewat menu: `index.html`, `tentang.html`, `struktur.html`, dan `hubungi.html`.
- Google Fonts memerlukan koneksi internet; font sistem akan dipakai sebagai cadangan jika offline.

## Mengganti foto dan logo

- Simpan foto dengan nama `slide-1.jpg`, `slide-2.jpg`, `slide-3.jpg`, `tentang.jpg`, `struktur.jpg`, dan `hubungi.jpg`. Untuk preview HTML, letakkan di `photos/`; untuk Next.js, letakkan juga di `public/photos/`. Gunakan foto yang sesuai dengan deskripsi `alt` di halaman. Foto pertama berprioritas tampil; foto lain dimuat seperlunya. Jika file belum ada atau gagal dimuat, panggung menampilkan ilustrasi SVG cadangan.
- Logo transparan perusahaan tersedia di `assets/logo.png`. `assets/logo.svg` menjadi favicon dan fallback lokal jika PNG tidak dapat dimuat.

## Mengubah informasi

- Nomor dan pesan awal WhatsApp ada pada konstanta `WHATSAPP_NUMBER` dan `DEFAULT_WHATSAPP_MESSAGE` di awal `js/main.js` (format internasional tanpa tanda `+` atau spasi).
- Ubah nama, alamat, email, nomor telepon, kalimat, dan teks tombol langsung pada HTML yang sesuai.
- Konten tiap slide ada pada atribut `data-label`, `data-title`, `data-focus`, dan `data-description` di `index.html`; foto dan teks pertama tampil sebelum JavaScript berjalan. Slideshow berganti tiap enam detik.
- Bagan organisasi berada dalam array `ORGANIZATION` di awal `js/main.js`; ubah nama divisi atau daftar unit di sana.
- Warna dan font situs dikelola dari variabel di awal `css/style.css`. Mode siang (latar terang) tampil sebagai default; tombol bulan beralih ke mode malam (latar gelap). Pilihan tidak disimpan dan selalu kembali ke mode siang ketika halaman dimuat ulang.
- WhatsApp dapat dibuka dari sidebar dan bagian kontak. Tidak ada tombol WhatsApp mengambang.
