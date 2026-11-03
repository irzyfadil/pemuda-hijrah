# Panduan Setup Pemuda Hijrah (dari nol sampai online)

Semua langkah dilakukan lewat browser. Tidak perlu terminal. Total sekitar 20–30 menit.
Nama menu di Supabase/GitHub bisa sedikit berbeda karena sering diperbarui. Kalau ada yang tidak cocok, kirim screenshot ke Claude.

Istilah singkat:
- **Supabase**: layanan yang menyimpan akun, data, dan foto kita (seperti "gudang" website).
- **GitHub Pages**: layanan gratis dari GitHub yang menayangkan file website supaya bisa dibuka lewat alamat (URL).

---

## Langkah 1 — Buat akun dan proyek Supabase
1. Buka https://supabase.com lalu klik **Start your project** dan daftar (bisa pakai akun GitHub atau email).
2. Klik **New project**. Isi:
   - Name: `pemuda-hijrah`
   - Database password: buat sandi kuat, **simpan sendiri**, jangan dikirim ke siapa pun.
   - Region: pilih yang terdekat (mis. Singapore).
   - Pilih paket **Free**.
3. Tunggu 1–2 menit sampai proyek siap.

## Langkah 2 — Pasang database dan aturan keamanan
1. Di menu kiri klik **SQL Editor**, lalu **New query**.
2. Buka file `supabase/schema.sql` dari folder proyek, salin **seluruh isinya**, tempel, klik **Run**.
3. Harus muncul "Success". Kalau ada error merah, kirim tulisannya ke Claude.
4. Buat query baru, tempel ini (ganti `kodeku-rahasia` dengan kode pilihanmu), lalu **Run**:

```sql
update public.app_settings set value = 'kodeku-rahasia' where key = 'invite_code';
```

Ini **kode undangan**: hanya teman yang kamu beri kode ini yang bisa mendaftar. Selama belum diganti, pendaftaran sengaja ditolak.

## Langkah 3 — Pengaturan login
1. Menu **Authentication** lalu bagian **Providers/Sign In**, pastikan **Email** aktif.
2. Opsi **Confirm email**:
   - Dimatikan: teman bisa langsung masuk setelah daftar (paling mudah).
   - Dinyalakan: teman harus klik link di email dulu.

## Langkah 4 — Hubungkan website ke Supabase
1. Di Supabase buka **Project Settings** lalu **API** (atau **API Keys**).
2. Catat dua hal: **Project URL** dan kunci **anon public** (atau **Publishable key**).
3. Buka file `js/config.js`, ganti dua tulisan `ISI_...` dengan nilai tersebut. Atau tempel keduanya ke Claude dan Claude yang mengisinya.

⚠️ Kunci **anon/publishable** aman dibagikan. Jangan pernah membagikan **service_role / secret key** atau **sandi database**.

## Langkah 5 — Tayangkan website lewat GitHub (gratis)
GitHub Pages menayangkan website langsung dari repository. Gratis, tetapi repository harus **Public** (kode terlihat publik, itu aman karena tidak ada rahasia di dalamnya; foto tetap privat di Supabase).

1. Buat akun di https://github.com (jika belum punya).
2. Klik tanda **+** di kanan atas, lalu **New repository**. Nama: `pemuda-hijrah`. Pilih **Public**. Jangan centang "Add a README". Klik **Create repository**.
3. Unggah isi proyek. Ada dua cara:
   - **Paling mudah:** beri tahu Claude nama akunmu dan repository-nya, lalu Claude yang mengunggah (kamu diminta memberi izin akses GitHub).
   - **Manual:** di komputer, ekstrak zip, lalu di halaman repository klik **uploading an existing file** dan seret seluruh isi folder `pemuda-hijrah`. Pastikan folder tersembunyi `.github` ikut terunggah (di Windows: Lihat > Item tersembunyi). Dari HP, cara manual ini sulit; pakai cara pertama.
4. Di repository, buka **Settings > Pages**. Pada **Source** pilih **GitHub Actions**.
5. Buka tab **Actions**, tunggu proses "Tayangkan ke GitHub Pages" bertanda centang hijau (sekitar 1 menit).
6. Alamat websitemu: `https://NAMAKAMU.github.io/pemuda-hijrah/`
7. Di Supabase buka **Authentication > URL Configuration**, isi **Site URL** dengan alamat itu.

Setiap kali ada perubahan kode, website diperbarui otomatis.

## Langkah 6 — Jadikan dirimu admin
1. Buka alamat website, klik tab **Daftar**, isi data dan kode undangan.
2. Di Supabase **SQL Editor**, jalankan (ganti emailnya):

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'emailmu@contoh.com');
```

Admin bisa menghapus foto anggota lain (moderasi).

## Langkah 7 — Uji sebelum dibagikan
Centang satu per satu:
- [ ] Daftar dengan kode salah ditolak, kode benar berhasil.
- [ ] Unggah foto dari HP, foto muncul di beranda.
- [ ] Buka foto, edit judul/caption, hasilnya tersimpan.
- [ ] Login dengan akun teman, foto teman **tidak** punya tombol Edit/Hapus.
- [ ] Buka alamat website di jendela penyamaran (tanpa login): harus diarahkan ke halaman masuk.
- [ ] Hapus foto: muncul konfirmasi dulu.

---

## Batas paket gratis (per pengecekan 3 November 2026)
Sumber: [Supabase Pricing](https://supabase.com/pricing) dan [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits). Angka bisa berubah, cek ulang sewaktu-waktu.

| Hal | Batas gratis |
|---|---|
| Supabase: database | 500 MB |
| Supabase: penyimpanan foto | 1 GB |
| Supabase: lalu lintas data (egress) | 5 GB per bulan (+5 GB cache) |
| Supabase: pengguna aktif | 50.000 per bulan |
| Supabase: **proyek tidur** | **Dijeda jika 7 hari tidak ada aktivitas** |
| GitHub Pages | Gratis untuk repository publik. Batas lunak: situs maks 1 GB, lalu lintas sekitar 100 GB/bulan, 10 build/jam |

Perkiraan: setiap foto diperkecil otomatis (sekitar 200–500 KB) plus thumbnail kecil, jadi 1 GB cukup untuk kira-kira ribuan foto. Foto sendiri dilayani oleh Supabase, bukan GitHub.

Hal penting:
- Kalau grup tidak membuka website selama seminggu, proyek Supabase bisa dijeda. Bisa diaktifkan lagi dari dashboard Supabase.
- Layanan gratis **bukan cadangan**. Simpan foto asli di HP atau Google Foto.
- Belum jelas apakah kartu pembayaran diminta saat daftar. Kalau diminta, jangan upgrade tanpa berpikir dulu.
