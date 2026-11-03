-- =====================================================================
-- PEMUDA HIJRAH — Skema database (Supabase / PostgreSQL)
--
-- Cara pakai:
--   Supabase > SQL Editor > New query > tempel SELURUH isi file ini > Run.
--
-- File ini aman dijalankan ulang (memakai "if not exists", "or replace",
-- dan "drop policy if exists"). Tidak ada perintah yang menghapus data.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) PENGATURAN RAHASIA: kode undangan
--    Tabel ini TIDAK bisa dibaca lewat website (tidak ada policy sama
--    sekali), hanya oleh fungsi database di bawah.
--    Selama nilainya masih 'GANTI_KODE_INI', pendaftaran ditolak.
-- ---------------------------------------------------------------------
create table if not exists public.app_settings (
  key   text primary key,
  value text not null
);

alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated;

insert into public.app_settings (key, value)
values ('invite_code', 'GANTI_KODE_INI')
on conflict (key) do nothing;


-- ---------------------------------------------------------------------
-- 2) PROFIL ANGGOTA
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 30),
  role         text not null default 'member' check (role in ('member', 'admin')),
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;


-- ---------------------------------------------------------------------
-- 3) FOTO KENANGAN
--    image_path = foto ukuran besar, thumb_path = foto kecil untuk galeri.
--    Keduanya WAJIB berada di folder milik pengunggah ("<user_id>/...").
-- ---------------------------------------------------------------------
create table if not exists public.photos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  title      text not null default '' check (char_length(title) <= 100),
  caption    text not null default '' check (char_length(caption) <= 1000),
  taken_on   date,
  image_path text not null,
  thumb_path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint photos_image_path_owner check (image_path like user_id::text || '/%'),
  constraint photos_thumb_path_owner check (thumb_path like user_id::text || '/%')
);

create index if not exists photos_created_at_idx on public.photos (created_at desc);

alter table public.photos enable row level security;


-- ---------------------------------------------------------------------
-- 4) FUNGSI BANTU
-- ---------------------------------------------------------------------

-- Apakah pengguna yang sedang login adalah admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Saat ada akun baru: cek kode undangan + nama, lalu buat profil.
-- Jika kode salah, pembuatan akun DIBATALKAN oleh database itu sendiri,
-- jadi tidak bisa dilewati dengan mengakali tampilan website.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  expected text;
  given    text;
  name     text;
begin
  select value into expected from public.app_settings where key = 'invite_code';
  given := trim(coalesce(new.raw_user_meta_data ->> 'invite_code', ''));

  if expected is null
     or expected = 'GANTI_KODE_INI'
     or given = ''
     or lower(given) <> lower(trim(expected)) then
    raise exception 'Kode undangan tidak valid';
  end if;

  name := trim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  if char_length(name) < 2 or char_length(name) > 30 then
    raise exception 'Nama tampilan harus 2-30 karakter';
  end if;

  insert into public.profiles (id, display_name) values (new.id, name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Anggota biasa tidak boleh mengubah peran dirinya menjadi admin.
-- (Perubahan lewat SQL Editor diizinkan karena tidak membawa identitas login.)
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Tidak boleh mengubah peran';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- Perbarui kolom updated_at otomatis saat foto diedit.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists photos_touch_updated_at on public.photos;
create trigger photos_touch_updated_at
  before update on public.photos
  for each row execute function public.touch_updated_at();


-- ---------------------------------------------------------------------
-- 5) ATURAN AKSES TABEL (Row Level Security)
--    Hanya yang SUDAH LOGIN ("authenticated") yang bisa melakukan apa pun.
--    Pengunjung tanpa login tidak bisa membaca satu baris pun.
-- ---------------------------------------------------------------------

-- Profil
drop policy if exists "profil: anggota boleh melihat" on public.profiles;
create policy "profil: anggota boleh melihat"
  on public.profiles for select to authenticated
  using (true);

drop policy if exists "profil: ubah milik sendiri" on public.profiles;
create policy "profil: ubah milik sendiri"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Foto
drop policy if exists "foto: anggota boleh melihat" on public.photos;
create policy "foto: anggota boleh melihat"
  on public.photos for select to authenticated
  using (true);

drop policy if exists "foto: unggah atas nama sendiri" on public.photos;
create policy "foto: unggah atas nama sendiri"
  on public.photos for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "foto: edit milik sendiri" on public.photos;
create policy "foto: edit milik sendiri"
  on public.photos for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "foto: hapus milik sendiri atau admin" on public.photos;
create policy "foto: hapus milik sendiri atau admin"
  on public.photos for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());


-- ---------------------------------------------------------------------
-- 6) PENYIMPANAN FILE FOTO (bucket PRIVAT bernama "photos")
--    - public = false  -> foto tidak punya alamat publik.
--    - Batas 5 MB per file, hanya JPEG/PNG/WebP.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public             = false,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "storage foto: anggota boleh melihat" on storage.objects;
create policy "storage foto: anggota boleh melihat"
  on storage.objects for select to authenticated
  using (bucket_id = 'photos');

drop policy if exists "storage foto: unggah ke folder sendiri" on storage.objects;
create policy "storage foto: unggah ke folder sendiri"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "storage foto: hapus milik sendiri atau admin" on storage.objects;
create policy "storage foto: hapus milik sendiri atau admin"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'photos'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- Sengaja TIDAK ada policy "update" untuk storage: file tidak bisa ditimpa.
