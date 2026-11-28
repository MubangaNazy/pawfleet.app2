-- AI Health Assistant usage, one row per person per day. Written only by the server (service role).
-- The limits themselves live in api/ai-health-insight.js (AI_DAILY_QUESTIONS / AI_MONTHLY_TOKENS env vars).

create table if not exists public.ai_usage (
  user_id uuid not null references public.users(id) on delete cascade,
  day date not null default ((now() at time zone 'Africa/Lusaka')::date),
  questions int not null default 0,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  primary key (user_id, day)
);

alter table public.ai_usage enable row level security;
drop policy if exists ai_usage_read_own on public.ai_usage;
create policy ai_usage_read_own on public.ai_usage for select to authenticated
  using (user_id = auth.uid() or public.pf_is_admin());

-- Adds one question's tokens to today's row in a single statement, so two quick taps can't both slip through uncounted.
create or replace function public.pf_ai_record(p_user uuid, p_in int, p_out int) returns void
language sql security definer set search_path = public as $$
  insert into public.ai_usage (user_id, day, questions, input_tokens, output_tokens)
  values (p_user, (now() at time zone 'Africa/Lusaka')::date, 1, greatest(p_in, 0), greatest(p_out, 0))
  on conflict (user_id, day) do update set
    questions = ai_usage.questions + 1,
    input_tokens = ai_usage.input_tokens + excluded.input_tokens,
    output_tokens = ai_usage.output_tokens + excluded.output_tokens;
$$;
revoke all on function public.pf_ai_record(uuid, int, int) from public, anon, authenticated;
grant execute on function public.pf_ai_record(uuid, int, int) to service_role;

-- Check afterwards (top users this month):
--   select u.name, sum(a.questions) q, sum(a.input_tokens + a.output_tokens) tokens
--   from ai_usage a join users u on u.id = a.user_id
--   where a.day >= date_trunc('month', now())::date group by 1 order by 3 desc limit 20;
