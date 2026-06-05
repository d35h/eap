-- EAP - structured juror evaluation: rating + text per criterion, draft/finish
-- lifecycle, admin unlock. Extends application_reviews. Run once in Supabase
-- SQL Editor. Idempotent. Builds on 0007.

alter table public.application_reviews
  add column if not exists scores      jsonb       not null default '{}',
  add column if not exists status      text        not null default 'draft',
  add column if not exists unlocked    boolean     not null default false,
  add column if not exists updated_at  timestamptz not null default now(),
  add column if not exists finished_at timestamptz;

alter table public.application_reviews
  drop constraint if exists application_reviews_status_check;
alter table public.application_reviews
  add constraint application_reviews_status_check check (status in ('draft', 'finished'));

-- ── Insert: jurors create their OWN row (draft or finished), never pre-unlocked.
drop policy if exists "jurors insert own review" on public.application_reviews;
create policy "jurors insert own review"
  on public.application_reviews for insert to authenticated
  with check (
    reviewer_id = auth.uid()
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'juror'
    and unlocked = false
  );

-- ── Update (juror): only their own, only while draft OR admin-unlocked, and a
--    juror can never set unlocked themselves (only admins can).
drop policy if exists "jurors update own draft" on public.application_reviews;
create policy "jurors update own draft"
  on public.application_reviews for update to authenticated
  using (
    reviewer_id = auth.uid()
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'juror'
    and (status = 'draft' or unlocked = true)
  )
  with check (
    reviewer_id = auth.uid()
    and unlocked = false
  );

-- ── Update (admin): used only to unlock (set unlocked=true, status='draft').
drop policy if exists "admins update reviews" on public.application_reviews;
create policy "admins update reviews"
  on public.application_reviews for update to authenticated
  using  ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' )
  with check ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' );

-- ── Artist-facing flag: mark the application 'reviewed' when a juror FINISHES
--    (not on a draft). Replaces the 0007 insert-time trigger.
drop trigger if exists trg_mark_reviewed on public.application_reviews;
create trigger trg_mark_reviewed
  after insert or update on public.application_reviews
  for each row when (new.status = 'finished')
  execute function public.mark_application_reviewed();
