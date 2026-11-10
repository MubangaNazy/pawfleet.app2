-- Pet Health journal entries (notes, symptoms, vet visits, weight, medication + the AI reply, where
-- there is one). Previously kept only in the browser's localStorage -- lost on a new device, never
-- visible to anyone else, despite a "Vet Visit" entry type implying it was meant to be shared.
create table if not exists public.health_journal (
  id          uuid primary key default gen_random_uuid(),
  dog_id      uuid not null references public.dogs(id) on delete cascade,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  type        text not null check (type in ('note', 'symptom', 'vet_visit', 'weight', 'medication')),
  content     text not null,
  weight_kg   numeric,
  ai_response text,
  created_at  timestamptz not null default now()
);

create index if not exists health_journal_dog_id_idx on public.health_journal(dog_id);
create index if not exists health_journal_owner_id_idx on public.health_journal(owner_id);

alter table public.health_journal enable row level security;

drop policy if exists "owners manage their own health journal" on public.health_journal;
create policy "owners manage their own health journal" on public.health_journal
  for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
