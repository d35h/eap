-- EAP - editions (archive by number) + juror deletion that keeps reviews.
-- Run once in Supabase SQL Editor. Idempotent.

-- Edition number on applications + the current edition on cycle_state.
alter table public.applications add column if not exists edition int not null default 1;
alter table public.cycle_state  add column if not exists current_edition int not null default 1;
create index if not exists applications_edition_idx on public.applications (edition);

-- New applications inherit the current edition automatically.
create or replace function public.set_application_edition()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select current_edition into new.edition from public.cycle_state where id = 1;
  if new.edition is null then new.edition := 1; end if;
  return new;
end; $$;
drop trigger if exists trg_set_edition on public.applications;
create trigger trg_set_edition
  before insert on public.applications
  for each row execute function public.set_application_edition();

-- Deleting a juror's auth account keeps their reviews: reviewer_id → NULL,
-- while reviewer_name/email (denormalized) remain readable.
alter table public.application_reviews alter column reviewer_id drop not null;
alter table public.application_reviews drop constraint if exists application_reviews_reviewer_id_fkey;
alter table public.application_reviews
  add constraint application_reviews_reviewer_id_fkey
  foreign key (reviewer_id) references auth.users(id) on delete set null;
