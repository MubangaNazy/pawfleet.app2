-- Per-pet care reminder intervals. Null means "use the app default" (30 days for wash/groom,
-- 180 days for a vet checkup) -- an owner only needs to set these if their pet needs something
-- different, e.g. a long-haired breed that needs washing more often.
alter table public.dogs add column if not exists wash_interval_days int;
alter table public.dogs add column if not exists vet_interval_days int;
