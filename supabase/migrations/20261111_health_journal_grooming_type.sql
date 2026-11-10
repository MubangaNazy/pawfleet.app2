-- Adds "grooming" as a loggable entry type, for the new "last washed" reminder on Pet Health.
alter table public.health_journal drop constraint if exists health_journal_type_check;
alter table public.health_journal add constraint health_journal_type_check
  check (type in ('note', 'symptom', 'vet_visit', 'weight', 'medication', 'grooming'));
