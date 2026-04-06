-- ============================================================
-- PawFleet Database Schema
-- Run this entire file in Supabase → SQL Editor → Run
-- ============================================================

-- Drop existing tables (clean slate)
drop table if exists public.health_logs cascade;
drop table if exists public.payments cascade;
drop table if exists public.walker_stats cascade;
drop table if exists public.walks cascade;
drop table if exists public.dogs cascade;
drop table if exists public.users cascade;

-- ── Users ──────────────────────────────────────────────────
create table public.users (
  id          uuid default gen_random_uuid() primary key,
  name        text not null,
  phone       text unique not null,
  email       text unique,
  password    text not null,
  role        text not null check (role in ('admin','walker','owner')),
  created_at  timestamptz default now()
);

-- ── Dogs ───────────────────────────────────────────────────
create table public.dogs (
  id          uuid default gen_random_uuid() primary key,
  name        text not null,
  breed       text,
  age         integer,
  owner_id    uuid references public.users(id) on delete cascade not null,
  image_url   text,
  notes       text,
  created_at  timestamptz default now()
);

-- ── Health Logs ────────────────────────────────────────────
create table public.health_logs (
  id           uuid default gen_random_uuid() primary key,
  dog_id       uuid references public.dogs(id) on delete cascade not null,
  date         date not null,
  water        boolean default false,
  food_morning boolean default false,
  food_evening boolean default false,
  unique(dog_id, date)
);

-- ── Walks ──────────────────────────────────────────────────
create table public.walks (
  id             uuid default gen_random_uuid() primary key,
  dog_id         uuid references public.dogs(id) not null,
  owner_id       uuid references public.users(id) not null,
  walker_id      uuid references public.users(id),
  status         text not null check (status in ('pending','assigned','active','completed','cancelled')) default 'pending',
  scheduled_date timestamptz,
  start_time     timestamptz,
  end_time       timestamptz,
  start_lat      double precision,
  start_lng      double precision,
  start_address  text,
  end_lat        double precision,
  end_lng        double precision,
  end_address    text,
  duration       integer,
  price          numeric not null default 150,
  walker_earning numeric not null default 100,
  notes          text,
  created_at     timestamptz default now()
);

-- ── Payments ───────────────────────────────────────────────
create table public.payments (
  id         uuid default gen_random_uuid() primary key,
  walker_id  uuid references public.users(id) not null,
  walk_id    uuid references public.walks(id) not null,
  amount     numeric not null,
  status     text not null check (status in ('unpaid','paid')) default 'unpaid',
  date       timestamptz not null default now(),
  paid_at    timestamptz,
  created_at timestamptz default now()
);

-- ── Walker Stats ───────────────────────────────────────────
create table public.walker_stats (
  id             uuid default gen_random_uuid() primary key,
  walker_id      uuid references public.users(id) unique not null,
  points         integer default 0,
  streak         integer default 0,
  last_walk_date date,
  badges         jsonb default '[]'::jsonb,
  updated_at     timestamptz default now()
);

-- ── Row Level Security (permissive for MVP) ────────────────
alter table public.users        enable row level security;
alter table public.dogs         enable row level security;
alter table public.health_logs  enable row level security;
alter table public.walks        enable row level security;
alter table public.payments     enable row level security;
alter table public.walker_stats enable row level security;

create policy "allow_all" on public.users        for all using (true) with check (true);
create policy "allow_all" on public.dogs         for all using (true) with check (true);
create policy "allow_all" on public.health_logs  for all using (true) with check (true);
create policy "allow_all" on public.walks        for all using (true) with check (true);
create policy "allow_all" on public.payments     for all using (true) with check (true);
create policy "allow_all" on public.walker_stats for all using (true) with check (true);

-- ── Seed Data ──────────────────────────────────────────────
insert into public.users (id, name, phone, email, password, role) values
  ('11111111-1111-1111-1111-111111111111', 'Chanda Mulenga', '0977000001', 'admin@pawfleet.zm',   'admin123',  'admin'),
  ('22222222-2222-2222-2222-222222222222', 'Bwalya Mutale',  '0977000002', 'walker1@pawfleet.zm', 'walker123', 'walker'),
  ('33333333-3333-3333-3333-333333333333', 'Mutinta Banda',  '0977000003', 'walker2@pawfleet.zm', 'walker123', 'walker'),
  ('44444444-4444-4444-4444-444444444444', 'Mwila Phiri',    '0977000004', 'owner1@pawfleet.zm',  'owner123',  'owner'),
  ('55555555-5555-5555-5555-555555555555', 'Namukolo Siame', '0977000005', 'owner2@pawfleet.zm',  'owner123',  'owner');

insert into public.walker_stats (walker_id, points, streak) values
  ('22222222-2222-2222-2222-222222222222', 120, 5),
  ('33333333-3333-3333-3333-333333333333', 80,  3);

insert into public.dogs (id, name, breed, age, owner_id, notes) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Rex',   'German Shepherd', 3, '44444444-4444-4444-4444-444444444444', 'Friendly but energetic'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Coco',  'Labrador',        2, '44444444-4444-4444-4444-444444444444', 'Loves water'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Bella', 'Poodle',          4, '55555555-5555-5555-5555-555555555555', 'Gentle and calm');

-- Enable realtime for live walk tracking
alter publication supabase_realtime add table public.walks;
alter publication supabase_realtime add table public.payments;
