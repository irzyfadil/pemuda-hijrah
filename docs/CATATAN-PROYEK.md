# Catatan Proyek Pemuda Hijrah

Terakhir diperbarui: 3 November 2026

## Keputusan teknis
| Hal | Keputusan | Alasan |
|---|---|---|
| Frontend | HTML + CSS + JavaScript biasa (tanpa build) | Server npm diblokir di lingkungan Claude saat itu, sehingga Next.js tidak bisa dipasang/diuji. Lebih sederhana untuk pemula, tidak perlu terminal. |
| Backend, login, database, storage | Supabase (Free) | Satu layanan untuk semua, ada Row Level Security. |
| Pustaka | `@supabase/supabase-js@2` dari CDN jsDelivr | Tidak butuh instalasi. Risiko: skrip pihak ketiga. Bisa diganti salinan lokal kelak. |
| Hosting | GitHub Pages lewat GitHub Actions (repo publik) | Gratis, otomatis update setiap push. Hanya file website yang ditayangkan. |
| Akses | Wajib login + kode undangan | Kode dicek di database (trigger), tidak bisa dilewati lewat tampilan. |
| Foto | Bucket **privat**, URL bertanda tangan 1 jam | Foto tidak punya alamat publik. |
| Ukuran/privasi foto | Diperkecil di perangkat (1600 px + thumbnail 480 px); EXIF/GPS hilang karena digambar ulang | Hemat kuota gratis dan melindungi lokasi. |
| Caption/judul/tanggal | Semua opsional; ada centang persetujuan teman di foto | Mengurangi hambatan unggah, tetap menjaga etika privasi. |

## Status (laporan jujur)
- Kode sudah ditulis: ya (4 halaman, 5 file JS, CSS, SQL).
- Kode dijalankan: ya, di Chromium dengan **Supabase palsu** (51 pemeriksaan lulus: login, galeri, detail, edit, hapus, unggah, kompres foto, tampilan HP/desktop, XSS dasar).
- Diuji dengan Supabase **asli**: **belum**. Terutama `schema.sql`, aturan RLS, bucket, dan trigger kode undangan belum pernah dijalankan di database sungguhan.
- Dipublikasikan online: **belum**. Belum ada URL.

## Yang harus dikerjakan pemilik (lihat docs/PANDUAN-SETUP.md)
Buat proyek Supabase, jalankan schema.sql, ganti kode undangan, isi js/config.js, deploy ke GitHub Pages, jadikan diri admin.

## Langkah berikutnya
1. Setelah Supabase siap: uji nyata semua alur, terutama aturan RLS (anggota tidak bisa edit/hapus milik orang lain, pengunjung tanpa login tidak bisa baca apa pun).
2. Perbaiki bug yang muncul di uji nyata.
3. Fitur lanjutan setelah inti stabil: like, komentar, pencarian, album, profil.

## Keterbatasan yang diketahui
- Foto HEIC mungkin gagal dibaca di browser non-Safari (ada pesan error ramah).
- Jika akun dihapus dari Supabase, file fotonya bisa tertinggal di storage (tidak terlihat siapa pun).
- Admin hanya bisa menghapus (bukan mengedit) postingan orang lain; belum ada UI kelola anggota/laporan.
