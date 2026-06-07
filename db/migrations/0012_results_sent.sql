-- EAP - track whether each tour's results have been emailed to participants.
-- Run once in Supabase SQL Editor. Idempotent.

alter table public.cycle_state
  add column if not exists tour1_results_sent boolean not null default false,
  add column if not exists tour2_results_sent boolean not null default false;
