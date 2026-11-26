-- Separate approvals per service, and a lock on fields only an admin may change.
--
-- 1. users.approvals: { "walking": "...", "grooming": "...", "training": "...", "breeder": "..." }
--    each one of: applied | approved | rejected. Walking and grooming are approved separately, so a
--    walker is not a groomer until an admin says so, and a grooming company never gets walk requests.
-- 2. A trigger stops people editing their own role, approval status or subscription. Before this,
--    the users update policy only blocked "make me admin", so a logged-in person could approve their
--    own walker application or give themselves a paid subscription by calling the database directly.

alter table public.users add column if not exists approvals jsonb not null default '{}'::jsonb;

-- ── Move existing accounts over ─────────────────────────────────────────────
-- Walkers: walking follows their current account status.
update public.users set approvals = approvals || jsonb_build_object('walking',
  -- (older accounts with no status were always treated as active)
  case when walker_status is null or walker_status = 'active' then 'approved'
       when walker_status = 'suspended' then 'rejected' else 'applied' end)
where role = 'walker' and not (approvals ? 'walking');

-- Trainers: copy the old pricing.trainerStatus ('applied' | 'approved' | 'rejected').
update public.users set approvals = approvals || jsonb_build_object('training', pricing->>'trainerStatus')
where role = 'walker' and pricing ? 'trainerStatus' and pricing->>'trainerStatus' in ('applied', 'approved', 'rejected')
  and not (approvals ? 'training');

-- Anyone who set a grooming price goes to the admin review queue (owner's decision, 2026-11-26).
update public.users set approvals = approvals || '{"grooming":"applied"}'::jsonb
where role = 'walker' and pricing ? 'grooming' and not (approvals ? 'grooming');

-- ── Who counts as trusted ───────────────────────────────────────────────────
-- Admins, the server (service role key) and the SQL editor (no login at all).
create or replace function public.pf_is_privileged() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is null
      or coalesce(auth.role(), '') = 'service_role'
      or exists (select 1 from public.users where id = auth.uid() and role = 'admin');
$$;

-- A person may apply (set a service to 'applied') but never approve or reject themselves.
create or replace function public.pf_self_approvals(old_a jsonb, new_a jsonb) returns jsonb
language plpgsql immutable as $$
declare k text; result jsonb := coalesce(old_a, '{}'::jsonb);
begin
  for k in select jsonb_object_keys(coalesce(new_a, '{}'::jsonb)) loop
    if k in ('walking', 'grooming', 'training', 'breeder')
       and new_a->>k = 'applied'
       and coalesce(result->>k, '') in ('', 'rejected') then
      result := result || jsonb_build_object(k, 'applied');
    end if;
  end loop;
  return result;
end $$;

create or replace function public.pf_users_protect() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.pf_is_privileged() then return new; end if;

  if tg_op = 'INSERT' then
    -- Sign-up: owner or walker only (also enforced by the insert policy), always starting unapproved.
    new.approvals := public.pf_self_approvals('{}'::jsonb, new.approvals);
    new.walker_status := case when new.role = 'walker' then 'pending_approval' else null end;
    new.subscription_paid_until := null;
    new.trial_ends_at := null;
    return new;
  end if;

  -- Self-edit: these stay as they were.
  new.role := old.role;
  new.walker_status := old.walker_status;
  new.subscription_paid_until := old.subscription_paid_until;
  new.trial_ends_at := old.trial_ends_at;
  new.approvals := public.pf_self_approvals(old.approvals, new.approvals);
  -- The old trainer flag lived in pricing; nobody may approve themselves through it either.
  if coalesce(new.pricing->>'trainerStatus', '') is distinct from coalesce(old.pricing->>'trainerStatus', '')
     and new.pricing->>'trainerStatus' in ('approved', 'rejected') then
    new.pricing := jsonb_set(coalesce(new.pricing, '{}'::jsonb), '{trainerStatus}',
      coalesce(old.pricing->'trainerStatus', '"applied"'::jsonb));
  end if;
  return new;
end $$;

drop trigger if exists trg_users_protect on public.users;
create trigger trg_users_protect before insert or update on public.users
  for each row execute function public.pf_users_protect();

-- ── Adopt a Pet: only approved breeders / shelters may post ─────────────────
drop policy if exists pf_adopt_insert on public.adoption_listings;
create policy pf_adopt_insert on public.adoption_listings for insert to authenticated
  with check (
    lister_id = auth.uid() and status = 'pending'
    and exists (select 1 from public.users u where u.id = auth.uid() and u.approvals->>'breeder' = 'approved')
  );

-- Check afterwards:
--   select role, approvals, count(*) from public.users group by 1, 2 order by 1;
