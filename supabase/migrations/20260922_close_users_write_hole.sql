-- ============================================================================
-- PawFleet: close a write hole found on the users table (2026-09-22)
-- Run once in Supabase Dashboard > SQL Editor (project tqoordnjsigllzjzkqxb).
-- Safe to run more than once.
--
-- What was found: anyone holding the app's public key (bundled in every phone,
-- not a secret) could INSERT a row straight into public.users with any role,
-- including 'admin' — no login, no Supabase Auth account, nothing. Confirmed
-- with a throwaway test row, deleted immediately.
--
-- Likely cause: a permissive policy such as `with check (true)` on users,
-- from a script written for a different project's table of the same name.
-- ============================================================================

-- 0. See exactly what is on the table right now, for the record.
select policyname, cmd, roles, qual, with_check
from pg_policies where schemaname = 'public' and tablename = 'users'
order by cmd;

-- 1. Remove every existing write policy on users (select policies are left alone).
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'users' and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  loop
    execute format('drop policy %I on public.users', r.policyname);
  end loop;
end $$;

alter table public.users enable row level security;

-- 2. Sign-up may only create your own row, as an ordinary owner or walker.
--    An admin (checked by looking up their own row) may create any row for anyone —
--    this is how "Admin > Walkers > Add" and shop/vet accounts are created today.
create policy "pf_users_insert" on public.users for insert to authenticated
  with check (
    (auth.uid() = id and role in ('owner', 'walker'))
    or exists (select 1 from public.users a where a.id = auth.uid() and a.role = 'admin')
  );

-- 3. You may edit your own row, but never grant yourself admin. Admins may edit anyone
--    (this is how walker approval, suspension and profile fixes are done).
create policy "pf_users_update" on public.users for update to authenticated
  using (
    auth.uid() = id
    or exists (select 1 from public.users a where a.id = auth.uid() and a.role = 'admin')
  )
  with check (
    (auth.uid() = id and role <> 'admin')
    or exists (select 1 from public.users a where a.id = auth.uid() and a.role = 'admin')
  );

-- No insert/update/delete policy is created for the public (anon) role, so a logged-out
-- visitor cannot write to this table at all. Deletes still go through /api/delete-account.

-- 4. The password column is unused since the move to Supabase Auth. Make sure it is empty.
update public.users set password = '' where password is distinct from '';

-- Diagnostics (read-only)
--   select policyname, cmd, roles from pg_policies where tablename = 'users' order by cmd;
--   select id, name, role from public.users where role = 'admin';   -- should be only accounts you made admin on purpose
