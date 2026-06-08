-- EAP - store the published Facebook post URL per application.
-- Run once in Supabase SQL Editor. Idempotent.

alter table public.applications
  add column if not exists facebook_url text;
