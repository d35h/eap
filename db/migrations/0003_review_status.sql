-- ============================================================================
--  EAP — add a review status, independent of payment status.
--  Run once in Supabase → SQL Editor. Idempotent (safe to re-run).
--
--  payment_status  : pending | paid | failed   (already exists)
--  review_status   : in_review | reviewed       (this migration)
--
--  An application enters review once it is paid; the jury flips it to
--  'reviewed' from the dashboard. We default to 'in_review' so the column is
--  always populated; the cabinet only surfaces it for paid applications.
-- ============================================================================

alter table public.applications
  add column if not exists review_status text not null default 'in_review';

-- Constrain the allowed values (drop first so re-runs don't error on the name).
alter table public.applications
  drop constraint if exists applications_review_status_check;
alter table public.applications
  add constraint applications_review_status_check
  check (review_status in ('in_review', 'reviewed'));
