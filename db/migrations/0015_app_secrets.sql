-- EAP - server-only secrets (e.g. the auto-refreshed Instagram token).
-- Run once in Supabase SQL Editor. Idempotent.
--
-- RLS is enabled with NO policies, so anon/authenticated clients can never read
-- it. Only the service role (Netlify functions) bypasses RLS to read/write.

create table if not exists public.app_secrets (
  key        text primary key,
  value      text,
  updated_at timestamptz not null default now()
);

alter table public.app_secrets enable row level security;
