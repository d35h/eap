-- EAP - "staff" = admin OR juror. Both read every application, update review
-- status, and read every uploaded file. Inviting jurors stays admin-only
-- (enforced in the invite-jury function, not here).
-- Run once in Supabase SQL Editor. Idempotent. Supersedes the admin-only
-- policies from 0004.

-- Applications: staff read all (owners still read their own).
drop policy if exists "admins read all applications" on public.applications;
drop policy if exists "staff read all applications"  on public.applications;
create policy "staff read all applications"
  on public.applications for select to authenticated
  using ( (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'juror') );

-- Applications: staff update (e.g. flip review_status).
drop policy if exists "admins update applications" on public.applications;
drop policy if exists "staff update applications"  on public.applications;
create policy "staff update applications"
  on public.applications for update to authenticated
  using  ( (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'juror') )
  with check ( (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'juror') );

-- Storage: staff read every work file (owners still read their own).
drop policy if exists "admins read all works" on storage.objects;
drop policy if exists "staff read all works"  on storage.objects;
create policy "staff read all works"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'works'
    and (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'juror')
  );
