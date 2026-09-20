-- ============================================================================
-- PawFleet realignment: chat + realtime
-- Run once in Supabase Dashboard > SQL Editor (project tqoordnjsigllzjzkqxb).
-- Safe to run more than once.
-- ============================================================================

-- 1. Direct messages (owner <-> walker <-> anyone) ---------------------------
create table if not exists public.direct_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id text not null,
  sender_id       uuid not null references public.users(id) on delete cascade,
  text            text not null,
  created_at      timestamptz default now()
);

create index if not exists idx_dm_conv on public.direct_messages (conversation_id, created_at);

alter table public.direct_messages enable row level security;

-- conversation_id is "<smaller uuid>_<larger uuid>", so a person may only touch
-- conversations that contain their own id.
drop policy if exists "Read own DMs"   on public.direct_messages;
drop policy if exists "Send DMs"       on public.direct_messages;
drop policy if exists "Delete own DMs" on public.direct_messages;

create policy "Read own DMs" on public.direct_messages for select to authenticated
  using (auth.uid()::text = any (string_to_array(conversation_id, '_')));

create policy "Send DMs" on public.direct_messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and auth.uid()::text = any (string_to_array(conversation_id, '_'))
  );

create policy "Delete own DMs" on public.direct_messages for delete to authenticated
  using (sender_id = auth.uid());

-- 2. Realtime: make sure the tables the app listens to are published ---------
do $$
declare t text;
begin
  foreach t in array array['direct_messages', 'messages', 'walks', 'users', 'notifications', 'payments', 'dogs']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;   -- already published
      when undefined_table  then null;   -- table does not exist in this project
    end;
  end loop;
end $$;

-- 3. Diagnostics (read-only) -------------------------------------------------
-- Which tables are broadcasting changes?
--   select tablename from pg_publication_tables where pubname = 'supabase_realtime' order by 1;
-- Which policies protect chat?
--   select tablename, policyname, cmd, roles from pg_policies
--   where tablename in ('direct_messages', 'messages') order by 1, 2;
-- Walkers waiting for approval (they are invisible to owners until approved):
--   select name, email, walker_status from public.users
--   where role = 'walker' order by created_at;

-- 4. Approving a walker by hand (normally an admin does this in Admin > Walkers)
--   update public.users set walker_status = 'active' where email = 'walker@example.com';
