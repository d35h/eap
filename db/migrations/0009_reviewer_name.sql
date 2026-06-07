-- EAP - store the juror's display name on each review row, populated server-side
-- from the juror's app_metadata.name. Run once in Supabase SQL Editor. Idempotent.

alter table public.application_reviews
  add column if not exists reviewer_name text not null default '';

-- Extend the existing BEFORE INSERT trigger to also fill reviewer_name.
create or replace function public.set_reviewer_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select email, coalesce(raw_app_meta_data ->> 'name', '')
    into new.reviewer_email, new.reviewer_name
    from auth.users where id = new.reviewer_id;
  return new;
end; $$;
