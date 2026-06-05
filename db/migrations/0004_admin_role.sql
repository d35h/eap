-- EAP - admin role: read every application, update review status, see all files.
-- Run once in Supabase SQL Editor. Idempotent.
--
-- An admin is a user with app_metadata.role = 'admin'. Set it with:
--   update auth.users
--   set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'
--   where email = 'you@example.com';
-- The role rides in the JWT, so RLS can trust auth.jwt()->'app_metadata'.
-- Policies are OR'd, so these ADD to the existing owner-only rules.

-- Admins can read all applications (owners still read their own).
drop policy if exists "admins read all applications" on public.applications;
create policy "admins read all applications"
  on public.applications for select to authenticated
  using ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' );

-- Admins can update applications (e.g. flip review_status to 'reviewed').
drop policy if exists "admins update applications" on public.applications;
create policy "admins update applications"
  on public.applications for update to authenticated
  using  ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' )
  with check ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' );

-- Admins can read every uploaded work file (owners still read their own).
drop policy if exists "admins read all works" on storage.objects;
create policy "admins read all works"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'works'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
