-- Adds "vaccination" as a loggable entry type, with an optional due_date for when the *next* one is
-- needed -- vaccination schedules are set by the vet to a specific date, not a rolling interval from
-- "last done" the way washing or a general checkup are.
alter table public.health_journal drop constraint if exists health_journal_type_check;
alter table public.health_journal add constraint health_journal_type_check
  check (type in ('note', 'symptom', 'vet_visit', 'weight', 'medication', 'grooming', 'vaccination'));

alter table public.health_journal add column if not exists due_date date;
