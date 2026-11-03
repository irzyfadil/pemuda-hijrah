# Pemuda Hijrah

Galeri kenangan digital privat untuk grup pertemanan. Login anggota, unggah foto + caption, foto disimpan privat di Supabase.

- Panduan pasang dari nol: [docs/PANDUAN-SETUP.md](docs/PANDUAN-SETUP.md)
- Catatan keputusan & status: [docs/CATATAN-PROYEK.md](docs/CATATAN-PROYEK.md)
- Database & aturan keamanan: [supabase/schema.sql](supabase/schema.sql)

## Keamanan
Repository ini publik (syarat GitHub Pages gratis), jadi **jangan pernah** menaruh sandi database, `service_role key`, atau secret key di file mana pun.
Yang boleh ada di `js/config.js` hanya **Project URL** dan **anon/publishable key** Supabase (memang dirancang publik).
Privasi foto dijaga oleh aturan database (RLS) dan bucket privat, bukan oleh kerahasiaan kode.
