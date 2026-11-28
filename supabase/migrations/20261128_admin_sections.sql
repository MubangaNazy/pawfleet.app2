-- Admin sections: application answers, shop payouts, and the trails database.

-- ── 1. Application answers ──────────────────────────────────────────────────
-- { "breeder": {...}, "grooming": {...}, "training": {...} }: what each person wrote in the application
-- form. Approval itself stays in users.approvals (which people cannot change themselves).
alter table public.users add column if not exists applications jsonb not null default '{}'::jsonb;

-- ── 2. Shop payouts ─────────────────────────────────────────────────────────
-- Buyers who pay online pay PawFleet; PawFleet pays each shop weekly. Every payout is recorded here,
-- so "owed" = online sales - payouts. Pay-on-delivery money goes straight to the shop and is not owed.
create table if not exists public.shop_payouts (
  id uuid primary key default gen_random_uuid(),
  shop_owner_id uuid not null references public.users(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  method text,                 -- e.g. Airtel Money, MTN, bank transfer, cash
  reference text,              -- transaction id from the transfer
  note text,
  period_end timestamptz,      -- online orders up to this moment are covered
  paid_at timestamptz not null default now(),
  created_by uuid references public.users(id)
);
create index if not exists shop_payouts_shop_idx on public.shop_payouts (shop_owner_id, paid_at desc);

alter table public.shop_payouts enable row level security;
drop policy if exists shop_payouts_admin on public.shop_payouts;
create policy shop_payouts_admin on public.shop_payouts for all to authenticated
  using (public.pf_is_admin()) with check (public.pf_is_admin());
drop policy if exists shop_payouts_own on public.shop_payouts;
create policy shop_payouts_own on public.shop_payouts for select to authenticated
  using (shop_owner_id = auth.uid());

-- ── 3. Trails ───────────────────────────────────────────────────────────────
-- Every finished walk's GPS route, kept in its own table so it can grow large without slowing the app.
-- Filled automatically when a walk is completed with a route; nothing in the app has to remember to do it.
create table if not exists public.trails (
  walk_id text primary key,
  walker_id text,
  owner_id text,
  dog_id text,
  started_at timestamptz,
  ended_at timestamptz,
  duration_min int,
  distance_m int,
  point_count int,
  points jsonb not null,        -- [[lat, lng], ...]
  min_lat double precision, max_lat double precision,
  min_lng double precision, max_lng double precision,
  start_lat double precision, start_lng double precision,
  created_at timestamptz not null default now()
);
create index if not exists trails_started_idx on public.trails (started_at desc);
create index if not exists trails_bbox_idx on public.trails (min_lat, max_lat, min_lng, max_lng);
create index if not exists trails_walker_idx on public.trails (walker_id);

alter table public.trails enable row level security;
drop policy if exists trails_read on public.trails;
create policy trails_read on public.trails for select to authenticated
  using (public.pf_is_admin() or walker_id = auth.uid()::text or owner_id = auth.uid()::text);
-- No insert/update policies: only the trigger below (and admins via the SQL editor) write trails.

-- Turns a walks row into a trails row. route_points may be text or jsonb holding [[lat, lng], ...].
create or replace function public.pf_trail_from_walk(w public.walks) returns void
language plpgsql security definer set search_path = public as $$
declare
  raw jsonb := to_jsonb(w.route_points);
  pts jsonb;
  n int;
  dist double precision := 0;
  i int;
  la1 double precision; lo1 double precision; la2 double precision; lo2 double precision;
begin
  if raw is null or raw = 'null'::jsonb then return; end if;
  pts := case when jsonb_typeof(raw) = 'string' then (raw #>> '{}')::jsonb else raw end;
  if jsonb_typeof(pts) <> 'array' then return; end if;
  n := jsonb_array_length(pts);
  if n < 2 then return; end if;

  -- distance along the route (haversine, metres)
  for i in 1 .. n - 1 loop
    la1 := (pts->(i-1)->>0)::float8; lo1 := (pts->(i-1)->>1)::float8;
    la2 := (pts->i->>0)::float8;     lo2 := (pts->i->>1)::float8;
    dist := dist + 2 * 6371000 * asin(sqrt(
      power(sin(radians(la2 - la1) / 2), 2) +
      cos(radians(la1)) * cos(radians(la2)) * power(sin(radians(lo2 - lo1) / 2), 2)));
  end loop;

  insert into public.trails (walk_id, walker_id, owner_id, dog_id, started_at, ended_at, duration_min,
    distance_m, point_count, points, min_lat, max_lat, min_lng, max_lng, start_lat, start_lng)
  select w.id::text, w.walker_id::text, w.owner_id::text, w.dog_id::text, w.start_time, w.end_time, w.duration,
    round(dist)::int, n, pts,
    min((p->>0)::float8), max((p->>0)::float8), min((p->>1)::float8), max((p->>1)::float8),
    (pts->0->>0)::float8, (pts->0->>1)::float8
  from jsonb_array_elements(pts) p
  on conflict (walk_id) do update set
    points = excluded.points, point_count = excluded.point_count, distance_m = excluded.distance_m,
    ended_at = excluded.ended_at, duration_min = excluded.duration_min,
    min_lat = excluded.min_lat, max_lat = excluded.max_lat, min_lng = excluded.min_lng, max_lng = excluded.max_lng;
exception when others then
  -- A bad route must never stop a walk from being saved.
  raise warning 'pf_trail_from_walk %: %', w.id, sqlerrm;
end $$;

create or replace function public.pf_walks_trail() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'completed' and new.route_points is not null
     and (tg_op = 'INSERT' or old.route_points is distinct from new.route_points or old.status is distinct from new.status) then
    perform public.pf_trail_from_walk(new);
  end if;
  return new;
end $$;

drop trigger if exists trg_walks_trail on public.walks;
create trigger trg_walks_trail after insert or update on public.walks
  for each row execute function public.pf_walks_trail();

-- Bring in every walk that already has a route.
select public.pf_trail_from_walk(w) from public.walks w where w.status = 'completed' and w.route_points is not null;

-- Check afterwards:
--   select count(*), round(sum(distance_m) / 1000.0) as km from public.trails;
