-- Advisor hygiene follow-up to the hardening chain:
--
-- 1) Pin search_path on helper functions flagged by the security advisor
--    (function_search_path_mutable).
-- 2) Revoke direct EXECUTE on rating-moderation trigger functions — they are
--    invoked by UPDATE on their tables only; exposing them over /rpc is
--    pointless surface (advisor: *_security_definer_function_executable).
-- public.get_hall_of_fame keeps its grants: it is a deliberate public RPC.

BEGIN;

DO $$
DECLARE
  r record;
  targets text[] := ARRAY[
    'generate_department_slug', 'set_department_defaults',
    'sync_department_reference', 'normalize_department_name_sql',
    'slugify_share_text', 'ensure_unique_share_slug',
    'assign_subject_material_share_slug', 'assign_material_group_share_slug',
    'assign_flashcard_deck_share_slug'
  ];
BEGIN
  FOR r IN
    SELECT p.oid, p.proname
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = ANY(targets)
      AND (p.proconfig IS NULL OR NOT ('search_path=public' = ANY(p.proconfig)))
  LOOP
    -- regprocedure renders the exact signature, so multi-arg helpers resolve.
    EXECUTE format('ALTER FUNCTION %s SET search_path = ''public''', r.oid::regprocedure);
    RAISE NOTICE 'pinned search_path: %', r.proname;
  END LOOP;
END $$;

REVOKE EXECUTE ON FUNCTION public.protect_subject_rating_moderation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_teacher_rating_moderation() FROM PUBLIC, anon, authenticated;

COMMIT;
