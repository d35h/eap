-- EAP - let the public Apply form check whether an email already has an account,
-- so it can show a friendly "you already have an account, log in" notice.
-- Run once in Supabase SQL Editor. Idempotent.
--
-- SECURITY DEFINER + returns only a boolean: callers learn existence, never any
-- user data. This does allow email enumeration, which is an acceptable trade-off
-- here (the check is non-blocking and the platform is a public open call).

create or replace function public.email_has_account(p_email text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from auth.users
    where lower(email) = lower(trim(p_email))
  );
$$;

grant execute on function public.email_has_account(text) to anon, authenticated;
