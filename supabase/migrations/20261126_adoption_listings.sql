-- Adopt a Pet: pets posted for adoption by owners or shelters. An admin approves each one before
-- anyone else can see it. Replaces the old Marketplace demo listings.

create table if not exists public.adoption_listings (
  id            uuid primary key default gen_random_uuid(),
  lister_id     uuid not null references public.users(id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 60),
  animal_type   text not null default 'dog' check (animal_type in ('dog', 'other')),
  breed         text,
  age_months    integer check (age_months between 0 and 360),
  sex           text check (sex in ('male', 'female', 'unknown')),
  size          text check (size in ('small', 'medium', 'large')),
  traits        text[] not null default '{}',
  description   text check (char_length(description) <= 1500),
  photo_url     text,
  location      text,
  contact_phone text not null,
  vaccinated    boolean not null default false,
  sterilised    boolean not null default false,
  adoption_fee  numeric(10,2) check (adoption_fee is null or adoption_fee >= 0),
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'adopted')),
  reject_reason text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_adoption_status on public.adoption_listings (status, created_at desc);

alter table public.adoption_listings enable row level security;
grant select, insert, update, delete on public.adoption_listings to authenticated;
revoke all on public.adoption_listings from anon;

create or replace function public.pf_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users where id = auth.uid() and role = 'admin');
$$;

drop policy if exists pf_adopt_read on public.adoption_listings;
create policy pf_adopt_read on public.adoption_listings for select to authenticated
  using (status in ('approved', 'adopted') or lister_id = auth.uid() or public.pf_is_admin());

-- New listings always start as pending, from the person themselves.
drop policy if exists pf_adopt_insert on public.adoption_listings;
create policy pf_adopt_insert on public.adoption_listings for insert to authenticated
  with check (lister_id = auth.uid() and status = 'pending');

-- Listers can edit their own pet and mark it adopted, never approve it themselves.
drop policy if exists pf_adopt_update_own on public.adoption_listings;
create policy pf_adopt_update_own on public.adoption_listings for update to authenticated
  using (lister_id = auth.uid())
  with check (lister_id = auth.uid() and status in ('pending', 'adopted'));

drop policy if exists pf_adopt_admin on public.adoption_listings;
create policy pf_adopt_admin on public.adoption_listings for all to authenticated
  using (public.pf_is_admin()) with check (public.pf_is_admin());

drop policy if exists pf_adopt_delete_own on public.adoption_listings;
create policy pf_adopt_delete_own on public.adoption_listings for delete to authenticated
  using (lister_id = auth.uid());

-- An edit by the lister sends the pet back for review (so an approved listing cannot be swapped for
-- something else after approval).
create or replace function public.pf_adopt_touch() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if not public.pf_is_admin() and new.status <> 'adopted' then
    new.status := 'pending';
  end if;
  return new;
end $$;

drop trigger if exists trg_adopt_touch on public.adoption_listings;
create trigger trg_adopt_touch before update on public.adoption_listings
  for each row execute function public.pf_adopt_touch();
