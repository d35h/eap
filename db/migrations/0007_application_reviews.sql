-- EAP - per-juror reviews. One application can be reviewed by many jurors
-- (one row per application+juror). Only jurors mark; admins only observe who
-- has reviewed. Run once in Supabase SQL Editor. Idempotent.

create table if not exists public.application_reviews (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  reviewer_id    uuid not null references auth.users(id) on delete cascade,
  reviewer_email text not null default '',
  created_at     timestamptz not null default now(),
  unique (application_id, reviewer_id)
);
create index if not exists application_reviews_app_idx on public.application_reviews (application_id);

alter table public.application_reviews enable row level security;

-- Only JURORS may record a review, and only their own (admins cannot mark).
drop policy if exists "jurors insert own review" on public.application_reviews;
create policy "jurors insert own review"
  on public.application_reviews for insert to authenticated
  with check (
    reviewer_id = auth.uid()
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'juror'
  );

-- Admins read every review (they see which jurors reviewed what).
drop policy if exists "staff read reviews"      on public.application_reviews;
drop policy if exists "admins read all reviews" on public.application_reviews;
create policy "admins read all reviews"
  on public.application_reviews for select to authenticated
  using ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' );

-- Jurors read ONLY their own reviews (not other jurors').
drop policy if exists "jurors read own reviews" on public.application_reviews;
create policy "jurors read own reviews"
  on public.application_reviews for select to authenticated
  using (
    reviewer_id = auth.uid()
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'juror'
  );

-- Fill reviewer_email server-side from the auth user (don't trust the client).
create or replace function public.set_reviewer_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select email into new.reviewer_email from auth.users where id = new.reviewer_id;
  return new;
end; $$;
drop trigger if exists trg_set_reviewer_email on public.application_reviews;
create trigger trg_set_reviewer_email
  before insert on public.application_reviews
  for each row execute function public.set_reviewer_email();

-- Keep the artist-facing flag in sync: once any juror reviews, mark 'reviewed'.
create or replace function public.mark_application_reviewed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.applications set review_status = 'reviewed' where id = new.application_id;
  return new;
end; $$;
drop trigger if exists trg_mark_reviewed on public.application_reviews;
create trigger trg_mark_reviewed
  after insert on public.application_reviews
  for each row execute function public.mark_application_reviewed();

-- Marking now happens only via this table (jurors). Remove the direct
-- review_status update path so an admin cannot flip it.
drop policy if exists "staff update applications" on public.applications;
