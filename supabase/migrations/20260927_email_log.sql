-- A record of every email PawFleet has sent, for the admin history page. Server-only, like
-- password_reset_tokens: written by api/send-email.js and api/send-receipt.js with the service
-- role key, read by api/admin-history.js the same way, never touched directly by the browser.
create table if not exists public.email_log (
  id          uuid primary key default gen_random_uuid(),
  to_email    text not null,
  template    text not null,
  subject     text not null,
  status      text not null default 'sent',
  error       text,
  resend_id   text,
  created_at  timestamptz not null default now()
);

create index if not exists email_log_created_at_idx on public.email_log(created_at desc);

alter table public.email_log enable row level security;
revoke all on public.email_log from anon, authenticated;
