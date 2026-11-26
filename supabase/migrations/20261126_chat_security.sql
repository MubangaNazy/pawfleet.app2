-- Walk chat (table `messages`) and its photos.
-- Only the walk's owner, its walker, and admins can read or post in a walk's chat. Pickup photos and
-- photos sent during a walk live in the `chat-images` bucket.
--
-- BEFORE running, you can see what is there now with:
--   select policyname, cmd, qual, with_check from pg_policies where tablename = 'messages';

create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  walk_id    uuid not null references public.walks(id) on delete cascade,
  sender_id  uuid not null references public.users(id) on delete cascade,
  text       text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_messages_walk on public.messages (walk_id, created_at);

alter table public.messages enable row level security;
grant select, insert, delete on public.messages to authenticated;
revoke all on public.messages from anon;

-- Remove whatever policies exist now (some may be "allow all"), then add the participant-only ones.
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'messages' loop
    execute format('drop policy %I on public.messages', p.policyname);
  end loop;
end $$;

create or replace function public.pf_in_walk(w uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.walks
    where id = w and (owner_id = auth.uid() or walker_id = auth.uid())
  ) or exists (select 1 from public.users where id = auth.uid() and role = 'admin');
$$;

create policy pf_messages_read on public.messages for select to authenticated
  using (public.pf_in_walk(walk_id));

create policy pf_messages_insert on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.pf_in_walk(walk_id));

create policy pf_messages_delete_own on public.messages for delete to authenticated
  using (sender_id = auth.uid());

-- Live updates for the chat screen.
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; when undefined_object then null;
end $$;

-- Photo bucket. Public read (links are long random paths), upload only when you are in that walk:
-- files are stored as <walk id>/<message id>.jpg.
insert into storage.buckets (id, name, public)
values ('chat-images', 'chat-images', true)
on conflict (id) do update set public = true;

drop policy if exists pf_chat_images_read on storage.objects;
create policy pf_chat_images_read on storage.objects for select
  using (bucket_id = 'chat-images');

drop policy if exists pf_chat_images_insert on storage.objects;
create policy pf_chat_images_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'chat-images'
    and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
    and public.pf_in_walk(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists pf_chat_images_update on storage.objects;
create policy pf_chat_images_update on storage.objects for update to authenticated
  using (bucket_id = 'chat-images' and owner = auth.uid());
