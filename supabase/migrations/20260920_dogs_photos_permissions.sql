-- ============================================================================
-- PawFleet: pets that stay saved, photos that upload
-- Run once in Supabase Dashboard > SQL Editor (project tqoordnjsigllzjzkqxb).
-- Safe to run more than once.
-- ============================================================================

-- 1. Ages like "8 months" (0.67 years) were being rejected because the column only held whole numbers.
alter table public.dogs alter column age type numeric(5,2) using age::numeric;

-- 2. Photo buckets: anyone can view, signed-in users can upload.
insert into storage.buckets (id, name, public)
values ('pet-images', 'pet-images', true), ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "pf_photos_read"   on storage.objects;
drop policy if exists "pf_photos_insert" on storage.objects;
drop policy if exists "pf_photos_update" on storage.objects;

create policy "pf_photos_read" on storage.objects for select
  using (bucket_id in ('pet-images', 'avatars'));

create policy "pf_photos_insert" on storage.objects for insert to authenticated
  with check (bucket_id in ('pet-images', 'avatars'));

create policy "pf_photos_update" on storage.objects for update to authenticated
  using (bucket_id in ('pet-images', 'avatars'))
  with check (bucket_id in ('pet-images', 'avatars'));

-- 3. Pets: everyone signed in can see them (walkers need to see the dog they are booked for),
--    but only the owner can add, change or remove their own.
alter table public.dogs enable row level security;

drop policy if exists "pf_dogs_read"   on public.dogs;
drop policy if exists "pf_dogs_insert" on public.dogs;
drop policy if exists "pf_dogs_update" on public.dogs;
drop policy if exists "pf_dogs_delete" on public.dogs;

create policy "pf_dogs_read"   on public.dogs for select to authenticated using (true);
create policy "pf_dogs_insert" on public.dogs for insert to authenticated with check (owner_id = auth.uid());
create policy "pf_dogs_update" on public.dogs for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "pf_dogs_delete" on public.dogs for delete to authenticated using (owner_id = auth.uid());

-- 4. Daily food and water logs belong to the pet's owner.
alter table public.health_logs enable row level security;

drop policy if exists "pf_health_read"  on public.health_logs;
drop policy if exists "pf_health_write" on public.health_logs;

create policy "pf_health_read" on public.health_logs for select to authenticated using (true);
create policy "pf_health_write" on public.health_logs for all to authenticated
  using (exists (select 1 from public.dogs d where d.id = health_logs.dog_id and d.owner_id = auth.uid()))
  with check (exists (select 1 from public.dogs d where d.id = health_logs.dog_id and d.owner_id = auth.uid()));

-- If step 2 fails with "must be owner of table objects", create the two buckets and the
-- upload policy from Storage > Policies in the dashboard instead, then run the rest.

-- Diagnostics (read-only)
--   select column_name, data_type from information_schema.columns where table_name = 'dogs' and column_name = 'age';
--   select id, public from storage.buckets;
--   select policyname, cmd from pg_policies where tablename in ('dogs', 'health_logs') order by 1;
