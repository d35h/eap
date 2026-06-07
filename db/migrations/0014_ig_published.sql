-- EAP - track Instagram auto-publishing of applications.
-- Run once in Supabase SQL Editor. Idempotent.

alter table public.applications
  add column if not exists published_at timestamptz;

create index if not exists applications_published_idx
  on public.applications (edition, payment_status, published_at);
