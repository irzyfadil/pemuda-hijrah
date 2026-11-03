// =====================================================================
// PEMUDA HIJRAH — Konfigurasi koneksi ke Supabase
//
// Ganti dua nilai di bawah dengan milik proyek Supabase kamu
// (lihat docs/PANDUAN-SETUP.md, Langkah 4).
//
// Aman untuk publik: "anon key" / "publishable key" memang dirancang
// terlihat di website. Keamanan data dijaga oleh aturan database (RLS)
// di supabase/schema.sql, BUKAN oleh kerahasiaan kunci ini.
//
// JANGAN PERNAH menaruh "service_role key" atau "secret key" di sini.
// =====================================================================
window.PH_CONFIG = {
  SUPABASE_URL: 'ISI_URL_PROJECT_SUPABASE',
  SUPABASE_ANON_KEY: 'ISI_ANON_ATAU_PUBLISHABLE_KEY'
};
