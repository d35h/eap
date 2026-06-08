-- EAP - let logged-in users apply too (e.g. a past-edition artist applying to
-- the new biennale). Inserts were anon-only, which blocked authenticated users.
-- Run once in Supabase SQL Editor. Idempotent.

-- Application insert for logged-in users: pending, while submissions are open,
-- tied to themselves (or left unlinked, like the anon flow).
drop policy if exists "auth insert pending" on public.applications;
create policy "auth insert pending"
  on public.applications for insert to authenticated
  with check (
    payment_status = 'pending'
    and public.submissions_open()
    and (user_id is null or user_id = auth.uid())
  );

-- Allow logged-in users to upload their work files to the private bucket.
drop policy if exists "auth upload works" on storage.objects;
create policy "auth upload works"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'works');
