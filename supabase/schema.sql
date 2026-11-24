-- IELTS Pro Practice — Postgres schema
-- Run in the Supabase SQL editor (free tier). No real secrets live here.

-- Enable pgcrypto for gen_random_uuid() on older Postgres versions.
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, created on sign-up (see trigger below)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role text not null default 'student'
    check (role in ('student', 'teacher', 'admin')),
  target_band numeric not null default 7.0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- tests: the seeded IELTS tests (content also lives in src/data/*.json;
-- this table is the source of truth once tests are imported)
-- ---------------------------------------------------------------------------
create table if not exists public.tests (
  id text primary key,
  title text not null,
  track text not null check (track in ('academic', 'general')),
  data jsonb not null default '{}'::jsonb
);

-- ---------------------------------------------------------------------------
-- test_attempts: one row per completed (or in-progress) module attempt
-- ---------------------------------------------------------------------------
create table if not exists public.test_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  test_id text not null,
  module text not null,
  raw_score integer,
  band numeric,
  answers jsonb not null default '{}'::jsonb,
  feedback jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists test_attempts_user_id_idx on public.test_attempts (user_id);
create index if not exists test_attempts_test_id_idx on public.test_attempts (test_id);

-- Logged-out attempts are stored too, so user_id must be nullable.
alter table public.test_attempts alter column user_id drop not null;

-- ---------------------------------------------------------------------------
-- uploads: metadata for files stored in Supabase Storage (audio, images,
-- PDFs, charts). The file bytes live in Storage buckets; this table is the
-- searchable record of who uploaded what and where it is used.
-- ---------------------------------------------------------------------------
create table if not exists public.uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  bucket text not null,
  path text not null,
  file_name text not null,
  file_size bigint,
  mime_type text,
  purpose text,
  created_at timestamptz not null default now()
);

create index if not exists uploads_user_id_idx on public.uploads (user_id);

-- ---------------------------------------------------------------------------
-- Auto-create a profile row when a new auth user signs up
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.tests enable row level security;
alter table public.test_attempts enable row level security;
alter table public.uploads enable row level security;

-- Helper: the signed-in user's role, read from their own profile row.
create or replace function public.current_role()
returns text
language sql
security definer
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- profiles: users read/update their own row; teachers and admins read all.
drop policy if exists "profiles: own row readable" on public.profiles;
create policy "profiles: own row readable" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles: teachers and admins read all" on public.profiles;
create policy "profiles: teachers and admins read all" on public.profiles
  for select using (public.current_role() in ('teacher', 'admin'));

drop policy if exists "profiles: own row updatable" on public.profiles;
create policy "profiles: own row updatable" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "profiles: admins manage all" on public.profiles;
create policy "profiles: admins manage all" on public.profiles
  for all using (public.current_role() = 'admin');

-- tests: readable by all authenticated users; writable by teacher/admin only.
drop policy if exists "tests: readable by authenticated users" on public.tests;
create policy "tests: readable by authenticated users" on public.tests
  for select using (auth.role() = 'authenticated');

drop policy if exists "tests: writable by teacher or admin" on public.tests;
create policy "tests: writable by teacher or admin" on public.tests
  for all using (public.current_role() in ('teacher', 'admin'));

-- test_attempts: users read/insert only their own attempts;
-- teachers read attempts of students; admins have full access.
drop policy if exists "attempts: own rows readable" on public.test_attempts;
create policy "attempts: own rows readable" on public.test_attempts
  for select using (auth.uid() = user_id);

drop policy if exists "attempts: own rows insertable" on public.test_attempts;
create policy "attempts: own rows insertable" on public.test_attempts
  for insert with check (auth.uid() = user_id);

drop policy if exists "attempts: own rows updatable" on public.test_attempts;
create policy "attempts: own rows updatable" on public.test_attempts
  for update using (auth.uid() = user_id);

drop policy if exists "attempts: teachers read student attempts" on public.test_attempts;
create policy "attempts: teachers read student attempts" on public.test_attempts
  for select using (
    public.current_role() = 'teacher'
    and exists (
      select 1 from public.profiles p
      where p.id = test_attempts.user_id and p.role = 'student'
    )
  );

drop policy if exists "attempts: admins manage all" on public.test_attempts;
create policy "attempts: admins manage all" on public.test_attempts
  for all using (public.current_role() = 'admin');

-- uploads: users manage only their own upload records;
-- teachers read student uploads; admins have full access.
drop policy if exists "uploads: own rows readable" on public.uploads;
create policy "uploads: own rows readable" on public.uploads
  for select using (auth.uid() = user_id);

drop policy if exists "uploads: own rows insertable" on public.uploads;
create policy "uploads: own rows insertable" on public.uploads
  for insert with check (auth.uid() = user_id);

drop policy if exists "uploads: own rows deletable" on public.uploads;
create policy "uploads: own rows deletable" on public.uploads
  for delete using (auth.uid() = user_id);

drop policy if exists "uploads: teachers read student uploads" on public.uploads;
create policy "uploads: teachers read student uploads" on public.uploads
  for select using (
    public.current_role() = 'teacher'
    and exists (
      select 1 from public.profiles p
      where p.id = uploads.user_id and p.role = 'student'
    )
  );

drop policy if exists "uploads: admins manage all" on public.uploads;
create policy "uploads: admins manage all" on public.uploads
  for all using (public.current_role() = 'admin');

-- ---------------------------------------------------------------------------
-- Storage buckets
-- Run in the Supabase dashboard (Storage) or via the SQL below.
-- NOTE: file size limits are enforced in app code, not here:
--   audio bucket  -> 50 MB max (listening audio)
--   uploads bucket -> 10 MB max (images / PDFs)
--   charts bucket -> 10 MB max (writing chart images)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values
  ('audio', 'audio', true),
  ('uploads', 'uploads', false),
  ('charts', 'charts', true)
on conflict (id) do nothing;

-- Storage policies: authenticated users upload to their own folder;
-- public buckets are world-readable, the private uploads bucket is not.
-- (Adjust in the dashboard if your access model changes.)
create policy "audio: public read" on storage.objects
  for select using (bucket_id = 'audio');
create policy "audio: authenticated upload" on storage.objects
  for insert with check (bucket_id = 'audio' and auth.role() = 'authenticated');

create policy "charts: public read" on storage.objects
  for select using (bucket_id = 'charts');
create policy "charts: authenticated upload" on storage.objects
  for insert with check (bucket_id = 'charts' and auth.role() = 'authenticated');

create policy "uploads: own files readable" on storage.objects
  for select using (bucket_id = 'uploads' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "uploads: own files writable" on storage.objects
  for insert with check (bucket_id = 'uploads' and auth.uid()::text = (storage.foldername(name))[1]);
