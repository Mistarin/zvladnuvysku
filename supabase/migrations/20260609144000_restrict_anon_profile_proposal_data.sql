-- PR-6: avoid leaking anonymous contribution counts and sensitive proposer data to anon.

CREATE OR REPLACE FUNCTION public.get_public_profile_stats(profile_user_id uuid)
RETURNS TABLE(
  faculty text,
  secondary_faculty text,
  flashcard_count bigint,
  material_count bigint,
  subject_count bigint,
  teacher_count bigint,
  subject_comment_count bigint,
  teacher_review_count bigint,
  approved_score bigint,
  total_xp integer,
  level integer,
  level_progress_xp integer,
  next_level_xp integer,
  public_subject_comment_count bigint,
  anon_subject_comment_count bigint,
  public_teacher_review_count bigint,
  anon_teacher_review_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH viewer_context AS (
    SELECT (
      auth.uid() = profile_user_id
      OR ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'moderator'))
    ) AS can_view_private
  ),
  profile_identity AS (
    SELECT p.faculty, p.secondary_faculty
    FROM profiles p
    WHERE p.user_id = profile_user_id
  ),
  flashcard_stats AS (
    SELECT
      COUNT(*)::bigint AS flashcard_count,
      COALESCE(
        SUM(
          CASE
            WHEN d.card_count <= 50 THEN 1
            WHEN d.card_count <= 100 THEN 2
            ELSE 3
          END
        )::bigint,
        0
      ) AS flashcard_points
    FROM flashcard_decks d
    WHERE d.creator_id = profile_user_id
      AND d.is_public = true
  ),
  material_stats AS (
    SELECT
      COUNT(*)::bigint AS material_count,
      COALESCE(
        SUM(
          COALESCE(
            m.points_override,
            CASE
              WHEN COALESCE(m.page_count, 0) <= 5 THEN 1
              WHEN m.page_count <= 15 THEN 2
              WHEN m.page_count <= 30 THEN 3
              ELSE 4
            END
          )
        )::bigint,
        0
      ) AS material_points
    FROM subject_materials m
    WHERE m.uploader_id = profile_user_id
      AND m.moderation_status = 'approved'
  ),
  subject_stats AS (
    SELECT
      COUNT(*)::bigint AS subject_count,
      COUNT(*)::bigint AS subject_points
    FROM subject_proposals sp
    JOIN subjects s ON s.id = sp.subject_id
    WHERE sp.proposed_by = profile_user_id
      AND sp.status = 'approved'
  ),
  teacher_stats AS (
    SELECT
      COUNT(*)::bigint AS teacher_count,
      COUNT(*)::bigint AS teacher_points
    FROM teachers t
    WHERE t.proposed_by = profile_user_id
      AND t.is_approved = true
  ),
  subject_comment_stats AS (
    SELECT
      COUNT(CASE WHEN NOT is_anonymous THEN 1 END)::bigint AS public_subject_comment_count,
      COUNT(CASE WHEN is_anonymous THEN 1 END)::bigint AS raw_anon_subject_comment_count
    FROM subject_ratings
    WHERE user_id = profile_user_id
      AND comment IS NOT NULL
      AND comment_is_approved = true
  ),
  teacher_review_stats AS (
    SELECT
      COUNT(CASE WHEN NOT is_anonymous THEN 1 END)::bigint AS public_teacher_review_count,
      COUNT(CASE WHEN is_anonymous THEN 1 END)::bigint AS raw_anon_teacher_review_count
    FROM teacher_ratings
    WHERE user_id = profile_user_id
      AND review IS NOT NULL
      AND comment_is_approved = true
  ),
  visible_counts AS (
    SELECT
      scs.public_subject_comment_count,
      CASE WHEN vc.can_view_private THEN scs.raw_anon_subject_comment_count ELSE 0 END AS anon_subject_comment_count,
      trs.public_teacher_review_count,
      CASE WHEN vc.can_view_private THEN trs.raw_anon_teacher_review_count ELSE 0 END AS anon_teacher_review_count
    FROM subject_comment_stats scs
    CROSS JOIN teacher_review_stats trs
    CROSS JOIN viewer_context vc
  ),
  totals AS (
    SELECT
      fs.flashcard_count,
      ms.material_count,
      ss.subject_count,
      ts.teacher_count,
      (vc.public_subject_comment_count + vc.anon_subject_comment_count)::bigint AS subject_comment_count,
      vc.public_subject_comment_count,
      vc.anon_subject_comment_count,
      (vc.public_teacher_review_count + vc.anon_teacher_review_count)::bigint AS teacher_review_count,
      vc.public_teacher_review_count,
      vc.anon_teacher_review_count,
      (
        fs.flashcard_points
        + ms.material_points
        + ss.subject_points
        + ts.teacher_points
        + vc.public_subject_comment_count
        + vc.anon_subject_comment_count
        + vc.public_teacher_review_count
        + vc.anon_teacher_review_count
      ) AS approved_score
    FROM flashcard_stats fs
    CROSS JOIN material_stats ms
    CROSS JOIN subject_stats ss
    CROSS JOIN teacher_stats ts
    CROSS JOIN visible_counts vc
  ),
  xp AS (
    SELECT
      flashcard_count,
      material_count,
      subject_count,
      teacher_count,
      subject_comment_count,
      public_subject_comment_count,
      anon_subject_comment_count,
      teacher_review_count,
      public_teacher_review_count,
      anon_teacher_review_count,
      approved_score,
      (approved_score * 10)::integer AS total_xp
    FROM totals
  )
  SELECT
    COALESCE(pi.faculty, NULL) AS faculty,
    COALESCE(pi.secondary_faculty, NULL) AS secondary_faculty,
    xp.flashcard_count,
    xp.material_count,
    xp.subject_count,
    xp.teacher_count,
    xp.subject_comment_count,
    xp.teacher_review_count,
    xp.approved_score,
    xp.total_xp,
    GREATEST(1, floor(sqrt(xp.total_xp::numeric / 100))::integer + 1) AS level,
    xp.total_xp - (((GREATEST(1, floor(sqrt(xp.total_xp::numeric / 100))::integer + 1) - 1)^2) * 100)::integer AS level_progress_xp,
    (((GREATEST(1, floor(sqrt(xp.total_xp::numeric / 100))::integer + 1)^2) * 100) - (((GREATEST(1, floor(sqrt(xp.total_xp::numeric / 100))::integer + 1) - 1)^2) * 100))::integer AS next_level_xp,
    xp.public_subject_comment_count,
    xp.anon_subject_comment_count,
    xp.public_teacher_review_count,
    xp.anon_teacher_review_count
  FROM xp
  LEFT JOIN profile_identity pi ON true;
$function$;

GRANT EXECUTE ON FUNCTION public.get_public_profile_stats(uuid) TO anon, authenticated;

REVOKE SELECT ON public.subject_proposals FROM anon;
GRANT SELECT (
  id,
  type,
  subject_id,
  note,
  submission_token,
  status,
  rejection_reason,
  reviewed_at,
  created_at
) ON public.subject_proposals TO anon;

REVOKE SELECT ON public.teachers FROM anon;
GRANT SELECT (
  id,
  slug,
  name,
  faculty,
  department,
  department_id,
  is_approved,
  created_at
) ON public.teachers TO anon;

NOTIFY pgrst, 'reload schema';
