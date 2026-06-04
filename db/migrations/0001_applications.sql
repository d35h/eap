-- ============================================================================
--  EAP — complete database schema (Phases 1–3: persistence, payments, accounts)
--  Run once in Supabase → SQL Editor. Idempotent (safe to re-run).
--  Auth users (auth.users) are managed by Supabase — no DDL needed for them.
-- ============================================================================

-- ── 1. Applications table ───────────────────────────────────────────────────
create table if not exists public.applications (
  id               uuid primary key default gen_random_uuid(),
  email            text not null,
  first_name       text not null default '',
  last_name        text not null default '',
  country          text not null default '',
  city             text not null default '',
  website          text not null default '',
  instagram        text not null default '',
  works            jsonb not null default '[]',
  tier             int  not null check (tier between 1 and 3),
  amount           int  not null,
  currency         text not null default 'BYN',
  payment_status   text not null default 'pending'
                     check (payment_status in ('pending', 'paid', 'failed')),
  payment_provider text,
  payment_ref      text,
  user_id          uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now()
);

-- Indexes: webhook looks up by payment_ref; cabinet reads by user_id.
create index if not exists applications_payment_ref_idx on public.applications (payment_ref);
create index if not exists applications_user_id_idx      on public.applications (user_id);
create index if not exists applications_email_idx        on public.applications (lower(email));

-- ── 2. Row-Level Security ───────────────────────────────────────────────────
alter table public.applications enable row level security;

-- Anonymous applicants may create a PENDING application (form runs before auth).
drop policy if exists "anon insert pending"                 on public.applications;
drop policy if exists "anon can insert pending applications" on public.applications;
create policy "anon insert pending"
  on public.applications for insert to anon
  with check (payment_status = 'pending');

-- A logged-in user may read ONLY their own application(s).
drop policy if exists "owner reads own"                on public.applications;
drop policy if exists "owner can read own applications" on public.applications;
create policy "owner reads own"
  on public.applications for select to authenticated
  using (auth.uid() = user_id);

-- NOTE: marking 'paid' and linking user_id happen server-side with the
-- service-role key (Netlify Functions), which bypasses RLS — so no additional
-- write policies are required beyond the anon insert above.

-- ── 3. Storage: private bucket for work files ───────────────────────────────
insert into storage.buckets (id, name, public)
values ('works', 'works', false)
on conflict (id) do nothing;

-- Anonymous client may UPLOAD into the works bucket.
-- (Files are read back server-side via short-lived signed URLs — no public read.)
drop policy if exists "anon upload works"          on storage.objects;
drop policy if exists "anon can upload work files" on storage.objects;
create policy "anon upload works"
  on storage.objects for insert to anon
  with check (bucket_id = 'works');
