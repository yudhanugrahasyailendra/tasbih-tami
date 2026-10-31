-- Jalankan di Supabase: SQL Editor
-- Bagian 1: tabel ucapan (lewati jika tabel wishes sudah ada)
create table if not exists wishes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  message text not null check (char_length(message) between 1 and 500),
  attendance text check (attendance in ('hadir','tidak','ragu')),
  created_at timestamptz default now()
);

alter table wishes enable row level security;

create policy "baca ucapan" on wishes for select using (true);
create policy "kirim ucapan" on wishes for insert with check (true);
-- Tanpa policy update/delete: keduanya ditolak untuk publik.
-- Moderasi (hapus ucapan) lewat Table Editor di dashboard.

-- Bagian 2: tamu terdaftar dan tautan pribadi

-- A1. Tabel guests. RLS aktif TANPA policy: anon tidak bisa select/insert/update/delete langsung
create table if not exists guests (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null check (char_length(name) between 1 and 60),
  group_label text,
  max_pax int not null default 2 check (max_pax between 1 and 10),
  created_at timestamptz default now()
);
alter table guests enable row level security;

-- A2. Baca satu tamu berdasarkan slug
create or replace function get_guest(p_slug text)
returns table (id uuid, name text, max_pax int)
language sql
stable
security definer
set search_path = public
as $$
  select g.id, g.name, g.max_pax
  from guests g
  where g.slug = p_slug
  limit 1
$$;

revoke all on function get_guest(text) from public;
grant execute on function get_guest(text) to anon, authenticated;

-- A3. Kolom tambahan di wishes
alter table wishes
  add column if not exists guest_id uuid references guests(id) on delete set null,
  add column if not exists pax int check (pax between 1 and 10);

notify pgrst, 'reload schema';
