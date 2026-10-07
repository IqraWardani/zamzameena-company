# PT Zamzameena Ainsa Synergy

Company profile statis berbahasa Indonesia, dibuat dengan HTML, CSS, dan JavaScript murni. Tidak memerlukan framework atau proses build.

## Menjalankan

- Buka `index.html` langsung di browser, atau buka folder ini di VS Code dan jalankan Live Server.
- Semua halaman dapat dibuka lewat menu: `index.html`, `tentang.html`, `struktur.html`, dan `hubungi.html`.
- Google Fonts memerlukan koneksi internet; font sistem akan dipakai sebagai cadangan jika offline.

## Mengganti foto dan logo

- Simpan foto lokal di folder `photos/` dengan nama `slide-1.jpg`, `slide-2.jpg`, `slide-3.jpg`, `tentang.jpg`, `struktur.jpg`, dan `hubungi.jpg`. Gunakan foto yang sesuai dengan deskripsi `alt` di halaman. Foto pertama berprioritas tampil; foto lain dimuat seperlunya. Jika file belum ada, panggung menampilkan ilustrasi SVG cadangan.
- Letakkan logo transparan perusahaan di `assets/logo.png`. Logo SVG lokal `assets/logo.svg` menjadi fallback dan favicon jika PNG belum tersedia. Saat ini folder `assets/` hanya memiliki fallback SVG.

## Mengubah informasi

- Nomor dan pesan awal WhatsApp ada pada konstanta `WHATSAPP_NUMBER` dan `DEFAULT_WHATSAPP_MESSAGE` di awal `js/main.js` (format internasional tanpa tanda `+` atau spasi).
- Ubah nama, alamat, email, nomor telepon, kalimat, dan teks tombol langsung pada HTML yang sesuai.
- Konten tiap slide ada pada atribut `data-label`, `data-title`, `data-focus`, dan `data-description` di `index.html`; foto dan teks pertama tampil sebelum JavaScript berjalan. Slideshow berganti tiap enam detik.
- Bagan organisasi berada dalam array `ORGANIZATION` di awal `js/main.js`; ubah nama divisi atau daftar unit di sana.
- Warna dan font situs dikelola dari variabel di awal `css/style.css`. Mode siang (latar gelap) tampil sebagai default; tombol bulan beralih ke mode malam (latar terang). Pilihan tidak disimpan dan selalu kembali ke mode siang ketika halaman dimuat ulang.
- WhatsApp dapat dibuka dari sidebar dan bagian kontak. Tidak ada tombol WhatsApp mengambang.
