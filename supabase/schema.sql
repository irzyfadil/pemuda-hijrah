-- =====================================================================
-- PEMUDA HIJRAH — Skema database (versi lanjutan untuk keamanan dan fitur komunitas)
-- =====================================================================

create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 30),
  bio          text not null default '' check (char_length(bio) <= 200),
  avatar_url   text,
  role         text not null default 'member' check (role in ('member', 'admin')),
  created_at   timestamptz not null default now()
);

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

create table if not exists public.photo_comments (
  id         uuid primary key default gen_random_uuid(),
  photo_id   uuid not null references public.photos (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  message    text not null check (char_length(message) between 1 and 500),
  created_at timestamptz not null default now()
);

create table if not exists public.chat_threads (
  id         uuid primary key default gen_random_uuid(),
  user_a     uuid not null references public.profiles (id) on delete cascade,
  user_b     uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_a, user_b)
);

create table if not exists public.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references public.chat_threads (id) on delete cascade,
  sender_id  uuid not null references public.profiles (id) on delete cascade,
  message    text not null check (char_length(message) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists photos_created_at_idx on public.photos (created_at desc);
create index if not exists comments_photo_idx on public.photo_comments (photo_id, created_at);
create index if not exists chat_threads_users_idx on public.chat_threads (user_a, user_b);
create index if not exists chat_messages_thread_idx on public.chat_messages (thread_id, created_at);

alter table public.profiles enable row level security;
alter table public.photos enable row level security;
alter table public.photo_comments enable row level security;
alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;

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

  if expected is null or expected = 'GANTI_KODE_INI' or given = '' or lower(given) <> lower(trim(expected)) then
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

create policy "profil: anggota boleh melihat" on public.profiles for select to authenticated using (true);
create policy "profil: ubah milik sendiri" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "foto: anggota boleh melihat" on public.photos for select to authenticated using (true);
create policy "foto: unggah atas nama sendiri" on public.photos for insert to authenticated with check (user_id = auth.uid());
create policy "foto: edit milik sendiri" on public.photos for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "foto: hapus milik sendiri atau admin" on public.photos for delete to authenticated using (user_id = auth.uid() or public.is_admin());

create policy "komentar: lihat semua" on public.photo_comments for select to authenticated using (true);
create policy "komentar: buat sendiri" on public.photo_comments for insert to authenticated with check (user_id = auth.uid());
create policy "komentar: hapus sendiri atau admin" on public.photo_comments for delete to authenticated using (user_id = auth.uid() or public.is_admin());

create policy "chat: lihat thread milik sendiri" on public.chat_threads for select to authenticated using (user_a = auth.uid() or user_b = auth.uid());
create policy "chat: buat thread baru" on public.chat_threads for insert to authenticated with check (user_a = auth.uid() or user_b = auth.uid());

create policy "chat pesan: lihat thread milik sendiri" on public.chat_messages for select to authenticated using (
  exists (select 1 from public.chat_threads where id = thread_id and (user_a = auth.uid() or user_b = auth.uid()))
);
create policy "chat pesan: kirim sendiri" on public.chat_messages for insert to authenticated with check (
  sender_id = auth.uid() and exists (select 1 from public.chat_threads where id = thread_id and (user_a = auth.uid() or user_b = auth.uid()))
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "storage foto: anggota boleh melihat" on storage.objects for select to authenticated using (bucket_id = 'photos');
create policy "storage foto: unggah ke folder sendiri" on storage.objects for insert to authenticated with check (
  bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "storage foto: hapus milik sendiri atau admin" on storage.objects for delete to authenticated using (
  bucket_id = 'photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);
