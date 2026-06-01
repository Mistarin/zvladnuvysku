ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS proposed_by uuid REFERENCES auth.users (id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;

CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT TO public
  USING (
    (display_name IS NOT NULL AND btrim(display_name) <> '')
    OR user_id = (select auth.uid())
    OR ((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'moderator')
  );

CREATE OR REPLACE FUNCTION public.get_public_profile_summaries(profile_user_ids uuid[])
RETURNS TABLE (
  user_id uuid,
  display_name text,
  total_xp integer,
  level integer
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH requested_users AS (
    SELECT DISTINCT requested_user_id AS user_id
    FROM unnest(COALESCE(profile_user_ids, ARRAY[]::uuid[])) AS requested_user_id
  )
  SELECT
    ru.user_id,
    p.display_name,
    COALESCE(stats.total_xp, 0)::integer AS total_xp,
    COALESCE(stats.level, 1)::integer AS level
  FROM requested_users ru
  LEFT JOIN public.profiles p ON p.user_id = ru.user_id
  LEFT JOIN LATERAL (
    SELECT s.total_xp, s.level
    FROM public.get_public_profile_stats(ru.user_id) s
    LIMIT 1
  ) stats ON true;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_profile_summaries(uuid[]) TO anon, authenticated;
