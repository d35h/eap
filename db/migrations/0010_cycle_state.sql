-- EAP - cycle_state: a single row driving submission control (and, later, tours).
-- Run once in Supabase SQL Editor. Idempotent.

create table if not exists public.cycle_state (
  id                   int primary key default 1,
  submissions_open     boolean     not null default true,
  submissions_deadline timestamptz,
  active_tour          int         not null default 1,
  tour1_open           boolean     not null default false,
  tour2_open           boolean     not null default false,
  updated_at           timestamptz not null default now(),
  constraint cycle_state_singleton check (id = 1)
);

-- Seed the single row; default the deadline to the open-call date.
insert into public.cycle_state (id, submissions_deadline)
values (1, '2027-03-31T23:59:00Z')
on conflict (id) do nothing;

alter table public.cycle_state enable row level security;

-- Admins manage the cycle; staff (admin+juror) may read it.
drop policy if exists "admins manage cycle" on public.cycle_state;
create policy "admins manage cycle"
  on public.cycle_state for all to authenticated
  using  ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' )
  with check ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' );

drop policy if exists "staff read cycle" on public.cycle_state;
create policy "staff read cycle"
  on public.cycle_state for select to authenticated
  using ( (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'juror') );

-- Public-callable effective state: open AND before the deadline.
-- SECURITY DEFINER so the anon Apply form can check without reading the table.
create or replace function public.submissions_open()
returns boolean language sql security definer set search_path = public stable as $$
  select coalesce(
    (select submissions_open and (submissions_deadline is null or now() < submissions_deadline)
       from public.cycle_state where id = 1),
    true);
$$;
grant execute on function public.submissions_open() to anon, authenticated;

-- Enforce submission control at the DB: anon may insert a pending application
-- only while the call is open.
drop policy if exists "anon insert pending" on public.applications;
create policy "anon insert pending"
  on public.applications for insert to anon
  with check (payment_status = 'pending' and public.submissions_open());
