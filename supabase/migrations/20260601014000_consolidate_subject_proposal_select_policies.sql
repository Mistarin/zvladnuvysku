DROP POLICY IF EXISTS "subject_proposals_public_approved_select" ON public.subject_proposals;
DROP POLICY IF EXISTS "subject_proposals_anon_approved_select" ON public.subject_proposals;
DROP POLICY IF EXISTS "subject_proposals_select" ON public.subject_proposals;

CREATE POLICY "subject_proposals_anon_approved_select"
  ON public.subject_proposals
  FOR SELECT
  TO anon
  USING (status = 'approved');

CREATE POLICY "subject_proposals_select"
  ON public.subject_proposals
  FOR SELECT
  TO authenticated
  USING (
    status = 'approved'
    OR proposed_by = (SELECT auth.uid())
    OR (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = ANY (ARRAY['admin', 'moderator']))
  );

NOTIFY pgrst, 'reload schema';
