-- Applications table
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  first_name text default '',
  last_name text default '',
  country text default '',
  city text default '',
  website text default '',
  instagram text default '',
  works jsonb not null default '[]',
  tier int not null,
  amount int not null,
  currency text not null default 'BYN',
  payment_status text not null default 'pending',
  payment_provider text,
  payment_ref text,
  user_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.applications enable row level security;

-- Anonymous applicants may create a pending application (the form runs before auth).
drop policy if exists "anon can insert pending applications" on public.applications;
create policy "anon can insert pending applications"
  on public.applications for insert
  to anon
  with check (payment_status = 'pending');

-- A logged-in user can read only their own application(s).
drop policy if exists "owner can read own applications" on public.applications;
create policy "owner can read own applications"
  on public.applications for select
  to authenticated
  using (auth.uid() = user_id);

-- Private Storage bucket for work files.
insert into storage.buckets (id, name, public)
values ('works', 'works', false)
on conflict (id) do nothing;

-- Anonymous client may upload into the works bucket (paths are app-scoped).
drop policy if exists "anon can upload work files" on storage.objects;
create policy "anon can upload work files"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'works');
