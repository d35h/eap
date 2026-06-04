-- ============================================================================
--  EAP — let an applicant read back the work files they uploaded.
--  Run once in Supabase → SQL Editor. Idempotent (safe to re-run).
--
--  Files live at  works/applications/<application_id>/work<N>.<ext>
--  storage.foldername(name) → {applications, <application_id>}, so [2] is the
--  application id. We grant SELECT only when that application belongs to the
--  logged-in user (auth.uid() = applications.user_id) — the same ownership rule
--  the applications table uses. The bucket stays private; the cabinet mints
--  short-lived signed URLs client-side for display.
-- ============================================================================

drop policy if exists "owner reads own works" on storage.objects;
create policy "owner reads own works"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'works'
    and exists (
      select 1 from public.applications a
      where a.user_id = auth.uid()
        and a.id::text = (storage.foldername(name))[2]
    )
  );
