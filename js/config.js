// =====================================================================
// PEMUDA HIJRAH — Konfigurasi koneksi ke Supabase
//
// Aman untuk publik: "publishable/anon key" memang dirancang terlihat di
// website. Keamanan data dijaga oleh aturan database (RLS) di
// supabase/schema.sql, BUKAN oleh kerahasiaan kunci ini.
//
// JANGAN PERNAH menaruh "service_role key" atau "secret key" di sini.
// =====================================================================
window.PH_CONFIG = {
  SUPABASE_URL: 'https://cxjqhgrzqkhszomwdrys.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_QRQm7C2nY-BaNLsOTbMO4w_x69R7Fz7'
};
