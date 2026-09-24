-- ============================================================================
-- PawFleet: phone numbers should never silently block an account
-- Run once in Supabase Dashboard > SQL Editor (project tqoordnjsigllzjzkqxb).
-- Safe to run more than once.
--
-- Login is by email through Supabase Auth. The `phone` column is just a
-- contact-info field shown in profiles, but it was still marked "unique,
-- cannot be empty" from before that change. Anyone who shared a phone number
-- with an existing account, or whose profile row was created with a blank
-- phone, silently failed to ever get a working profile: the error was never
-- shown to them (see AppContext.tsx register()/login() fixes in this commit).
-- ============================================================================

alter table public.users alter column phone drop not null;

do $$
begin
  alter table public.users drop constraint users_phone_key;
exception
  when undefined_object then null; -- constraint name differs or already dropped
end $$;

-- Belt and braces: drop any other unique index left on phone, whatever it's named.
do $$
declare r record;
begin
  for r in
    select indexname from pg_indexes
    where schemaname = 'public' and tablename = 'users' and indexdef ilike '%UNIQUE%' and indexdef ilike '%(phone)%'
  loop
    execute format('drop index public.%I', r.indexname);
  end loop;
end $$;

-- Diagnostics (read-only)
--   select conname from pg_constraint where conrelid = 'public.users'::regclass;
--   select indexname, indexdef from pg_indexes where tablename = 'users';
