-- EAP - tours data model: applications get a tour + standing; reviews become
-- per-tour (a juror evaluates the same application again in tour 2).
-- Run once in Supabase SQL Editor. Idempotent. Builds on 0007-0010.

-- Applications: which tour they sit in + their standing.
alter table public.applications
  add column if not exists tour     int  not null default 1,
  add column if not exists standing text not null default 'active';
alter table public.applications drop constraint if exists applications_standing_check;
alter table public.applications add constraint applications_standing_check
  check (standing in ('active', 'advanced', 'eliminated', 'winner'));

-- Reviews: add tour and re-key uniqueness to (application, reviewer, tour).
alter table public.application_reviews
  add column if not exists tour int not null default 1;

-- Drop the old 2-column unique (auto-named) so a juror can review per tour.
alter table public.application_reviews
  drop constraint if exists application_reviews_application_id_reviewer_id_key;
create unique index if not exists application_reviews_app_rev_tour_key
  on public.application_reviews (application_id, reviewer_id, tour);
