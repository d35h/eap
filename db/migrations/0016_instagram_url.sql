-- EAP - store the published Instagram post URL (permalink) per application.
-- Run once in Supabase SQL Editor. Idempotent.

alter table public.applications
  add column if not exists instagram_url text;
