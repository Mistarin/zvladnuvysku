DROP FUNCTION IF EXISTS public.get_public_profile_stats(uuid);
DROP FUNCTION IF EXISTS public.get_hall_of_fame(text, integer);

-- 1. Re-create get_hall_of_fame as SECURITY DEFINER to query raw ratings tables directly
CREATE OR REPLACE FUNCTION public.get_hall_of_fame(
  period_key text DEFAULT 'all',
  entry_limit integer DEFAULT 10
)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  faculty text,
  total_score bigint,
  flashcard_count bigint,
  material_count bigint,
  subject_count bigint,
  teacher_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH window_bounds AS (
    SELECT CASE period_key
      WHEN 'week'  THEN now() - interval '7 days'
      WHEN 'month' THEN now() - interval '30 days'
      ELSE NULL
    END AS start_at
  ),
  flashcard_scores AS (
    SELECT
      d.creator_id AS user_id,
      COUNT(*)::bigint AS flashcard_count,
      SUM(
        CASE
          WHEN d.card_count <= 50 THEN 1
          WHEN d.card_count <= 100 THEN 2
          ELSE 3
        END
      )::bigint AS flashcard_points
    FROM flashcard_decks d
    CROSS JOIN window_bounds wb
    WHERE d.is_public = true
      AND (wb.start_at IS NULL OR d.created_at >= wb.start_at)
    GROUP BY d.creator_id
  ),
  material_scores AS (
    SELECT
      m.uploader_id AS user_id,
      COUNT(*)::bigint AS material_count,
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
      )::bigint AS material_points
    FROM subject_materials m
    CROSS JOIN window_bounds wb
    WHERE m.moderation_status = 'approved'
      AND (wb.start_at IS NULL OR m.created_at >= wb.start_at)
    GROUP BY m.uploader_id
  ),
  subject_scores AS (
    SELECT
      sp.proposed_by AS user_id,
      COUNT(*)::bigint AS subject_count,
      COUNT(*)::bigint AS subject_points
    FROM subject_proposals sp
    JOIN subjects s ON s.id = sp.subject_id
    CROSS JOIN window_bounds wb
    WHERE sp.status = 'approved'
      AND (wb.start_at IS NULL OR sp.created_at >= wb.start_at)
    GROUP BY sp.proposed_by
  ),
  teacher_scores AS (
    SELECT
      t.proposed_by AS user_id,
      COUNT(*)::bigint AS teacher_count,
      COUNT(*)::bigint AS teacher_points
    FROM teachers t
    CROSS JOIN window_bounds wb
    WHERE t.is_approved = true
      AND t.proposed_by IS NOT NULL
      AND (wb.start_at IS NULL OR t.created_at >= wb.start_at)
    GROUP BY t.proposed_by
  ),
  subject_review_scores AS (
    SELECT
      sr.user_id,
      COUNT(*)::bigint AS subject_review_points
    FROM subject_ratings sr
    CROSS JOIN window_bounds wb
    WHERE sr.comment IS NOT NULL
      AND sr.comment_is_approved = true
      AND (wb.start_at IS NULL OR sr.created_at >= wb.start_at)
    GROUP BY sr.user_id
  ),
  teacher_review_scores AS (
    SELECT
      tr.user_id,
      COUNT(*)::bigint AS teacher_review_points
    FROM teacher_ratings tr
    CROSS JOIN window_bounds wb
    WHERE tr.review IS NOT NULL
      AND tr.comment_is_approved = true
      AND (wb.start_at IS NULL OR tr.created_at >= wb.start_at)
    GROUP BY tr.user_id
  ),
  combined AS (
    SELECT
      COALESCE(f.user_id, m.user_id, s.user_id, t.user_id, sr.user_id, tr.user_id) AS user_id,
      COALESCE(f.flashcard_count, 0) AS flashcard_count,
      COALESCE(m.material_count, 0) AS material_count,
      COALESCE(s.subject_count, 0) AS subject_count,
      COALESCE(t.teacher_count, 0) AS teacher_count,
      COALESCE(f.flashcard_points, 0) AS flashcard_points,
      COALESCE(m.material_points, 0) AS material_points,
      COALESCE(s.subject_points, 0) AS subject_points,
      COALESCE(t.teacher_points, 0) AS teacher_points,
      COALESCE(sr.subject_review_points, 0) AS subject_review_points,
      COALESCE(tr.teacher_review_points, 0) AS teacher_review_points
    FROM flashcard_scores f
    FULL OUTER JOIN material_scores m ON m.user_id = f.user_id
    FULL OUTER JOIN subject_scores s ON s.user_id = COALESCE(f.user_id, m.user_id)
    FULL OUTER JOIN teacher_scores t ON t.user_id = COALESCE(f.user_id, m.user_id, s.user_id)
    FULL OUTER JOIN subject_review_scores sr ON sr.user_id = COALESCE(f.user_id, m.user_id, s.user_id, t.user_id)
    FULL OUTER JOIN teacher_review_scores tr ON tr.user_id = COALESCE(f.user_id, m.user_id, s.user_id, t.user_id, sr.user_id)
  )
  SELECT
    c.user_id,
    p.display_name,
    p.faculty,
    (c.flashcard_points + c.material_points + c.subject_points + c.teacher_points + c.subject_review_points + c.teacher_review_points) AS total_score,
    c.flashcard_count,
    c.material_count,
    c.subject_count,
    c.teacher_count
  FROM combined c
  JOIN profiles p ON p.user_id = c.user_id
  WHERE p.display_name IS NOT NULL
    AND btrim(p.display_name) <> ''
    AND (c.flashcard_points + c.material_points + c.subject_points + c.teacher_points + c.subject_review_points + c.teacher_review_points) > 0
  ORDER BY
    total_score              DESC,
    c.flashcard_points       DESC,
    c.material_points        DESC,
    c.subject_points         DESC,
    c.teacher_points         DESC,
    c.subject_review_points  DESC,
    c.teacher_review_points  DESC,
    c.flashcard_count        DESC,
    c.material_count         DESC,
    c.subject_count          DESC,
    c.teacher_count          DESC,
    p.display_name           ASC
  LIMIT GREATEST(COALESCE(entry_limit, 10), 1);
$function$;

-- 2. Re-create get_public_profile_stats as SECURITY DEFINER, counting anonymous reviews and splitting counts
CREATE OR REPLACE FUNCTION public.get_public_profile_stats(profile_user_id uuid)
RETURNS TABLE(
  faculty text,
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
  WITH profile_identity AS (
    SELECT p.faculty
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
      COUNT(*)::bigint AS subject_comment_count,
      COUNT(CASE WHEN NOT is_anonymous THEN 1 END)::bigint AS public_subject_comment_count,
      COUNT(CASE WHEN is_anonymous THEN 1 END)::bigint AS anon_subject_comment_count
    FROM subject_ratings
    WHERE user_id = profile_user_id
      AND comment IS NOT NULL
      AND comment_is_approved = true
  ),
  teacher_review_stats AS (
    SELECT
      COUNT(*)::bigint AS teacher_review_count,
      COUNT(CASE WHEN NOT is_anonymous THEN 1 END)::bigint AS public_teacher_review_count,
      COUNT(CASE WHEN is_anonymous THEN 1 END)::bigint AS anon_teacher_review_count
    FROM teacher_ratings
    WHERE user_id = profile_user_id
      AND review IS NOT NULL
      AND comment_is_approved = true
  ),
  totals AS (
    SELECT
      fs.flashcard_count,
      ms.material_count,
      ss.subject_count,
      ts.teacher_count,
      scs.subject_comment_count,
      scs.public_subject_comment_count,
      scs.anon_subject_comment_count,
      trs.teacher_review_count,
      trs.public_teacher_review_count,
      trs.anon_teacher_review_count,
      (fs.flashcard_points + ms.material_points + ss.subject_points + ts.teacher_points + scs.subject_comment_count + trs.teacher_review_count) AS approved_score
    FROM flashcard_stats fs
    CROSS JOIN material_stats ms
    CROSS JOIN subject_stats ss
    CROSS JOIN teacher_stats ts
    CROSS JOIN subject_comment_stats scs
    CROSS JOIN teacher_review_stats trs
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

GRANT EXECUTE ON FUNCTION public.get_hall_of_fame(text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile_stats(uuid) TO anon, authenticated;
