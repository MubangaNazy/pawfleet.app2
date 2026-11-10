-- "Share with vet" links: a read-only, reusable (not single-use like a password reset token) link to
-- one dog's health journal. Server-only, like password_reset_tokens -- only api/pet-health-share.js
-- ever reads or writes this, using the service role key, never the browser directly.
create table if not exists public.health_journal_shares (
  id          uuid primary key default gen_random_uuid(),
  dog_id      uuid not null references public.dogs(id) on delete cascade,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  token_hash  text not null unique,
  created_at  timestamptz not null default now(),
  revoked_at  timestamptz
);

create index if not exists health_journal_shares_dog_id_idx on public.health_journal_shares(dog_id);

alter table public.health_journal_shares enable row level security;
revoke all on public.health_journal_shares from anon, authenticated;
