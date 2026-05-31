CREATE SCHEMA IF NOT EXISTS extensions;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'pg_trgm'
      AND n.nspname = 'public'
  ) THEN
    ALTER EXTENSION pg_trgm SET SCHEMA extensions;
  END IF;
END;
$$;

GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "subject_proposals_public_approved_select" ON public.subject_proposals;
CREATE POLICY "subject_proposals_public_approved_select"
  ON public.subject_proposals
  FOR SELECT
  TO public
  USING (status = 'approved');

REVOKE ALL ON TABLE public.subject_proposals FROM anon;
GRANT SELECT (
  id,
  type,
  subject_id,
  data,
  proposed_by,
  status,
  created_at
) ON TABLE public.subject_proposals TO anon;

ALTER FUNCTION public.get_hall_of_fame(text, integer) SECURITY INVOKER;
ALTER FUNCTION public.get_public_profile_stats(uuid) SECURITY INVOKER;
ALTER FUNCTION public.get_public_profile_subject_proposals(uuid, integer) SECURITY INVOKER;

NOTIFY pgrst, 'reload schema';
