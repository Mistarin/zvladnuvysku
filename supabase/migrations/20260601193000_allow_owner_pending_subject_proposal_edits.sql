DROP POLICY IF EXISTS "subject_proposals_owner_pending_update" ON public.subject_proposals;
CREATE POLICY "subject_proposals_owner_pending_update"
  ON public.subject_proposals
  FOR UPDATE
  TO authenticated
  USING (
    proposed_by = (SELECT auth.uid())
    AND status = 'pending'
  )
  WITH CHECK (
    proposed_by = (SELECT auth.uid())
    AND status = 'pending'
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND rejection_reason IS NULL
  );

DROP POLICY IF EXISTS "subject_proposals_owner_pending_delete" ON public.subject_proposals;
CREATE POLICY "subject_proposals_owner_pending_delete"
  ON public.subject_proposals
  FOR DELETE
  TO authenticated
  USING (
    proposed_by = (SELECT auth.uid())
    AND status = 'pending'
  );

NOTIFY pgrst, 'reload schema';
