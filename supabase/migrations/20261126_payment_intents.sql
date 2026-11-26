-- One row per mobile money prompt PawFleet asks Lenco to send.
-- Written only by the server (api/payments.js, service role). People can read their own rows.
-- Why: payments used to be created and "confirmed" by the phone itself, with a new prompt on every tap
-- and no record of what was charged. This table is the record, and it is what stops duplicates.

create table if not exists public.payment_intents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  kind        text not null check (kind in ('shop_order', 'walk', 'subscription', 'plan')),
  ref_id      text,                      -- walk id, cart signature, plan purchase id ...
  amount      numeric(12,2) not null check (amount > 0),
  currency    text not null default 'ZMW',
  reference   text not null unique,      -- sent to Lenco; unique so one payment can only be applied once
  operator    text not null check (operator in ('airtel', 'mtn', 'zamtel')),
  phone       text not null,
  lenco_id    text,
  status      text not null default 'pending' check (status in ('pending', 'successful', 'failed', 'expired')),
  lenco_status text,
  payload     jsonb not null default '{}'::jsonb,
  result      jsonb not null default '{}'::jsonb,   -- what was created on success, e.g. order ids
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_payment_intents_user on public.payment_intents (user_id, created_at desc);
create index if not exists idx_payment_intents_pending on public.payment_intents (status) where status = 'pending';

alter table public.payment_intents enable row level security;
revoke all on public.payment_intents from anon, authenticated;
grant select on public.payment_intents to authenticated;

drop policy if exists pf_payment_intents_read_own on public.payment_intents;
create policy pf_payment_intents_read_own on public.payment_intents
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

-- Shop orders get the Lenco reference so an order can always be matched to its payment.
alter table public.shop_orders add column if not exists payment_reference text;
