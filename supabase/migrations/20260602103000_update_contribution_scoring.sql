CREATE OR REPLACE FUNCTION public.get_hall_of_fame(
  period_key text DEFAULT 'all',
  entry_limit integer DEFAULT 10
)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  total_score bigint,
  flashcard_count bigint,
  material_count bigint,
  subject_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
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
        CASE
          WHEN COALESCE(m.page_count, 0) < 5 THEN 0
          WHEN m.page_count <= 15 THEN 2
          ELSE 3
        END
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
  combined AS (
    SELECT
      COALESCE(f.user_id, m.user_id, s.user_id) AS user_id,
      COALESCE(f.flashcard_count, 0) AS flashcard_count,
      COALESCE(m.material_count, 0) AS material_count,
      COALESCE(s.subject_count, 0) AS subject_count,
      COALESCE(f.flashcard_points, 0) AS flashcard_points,
      COALESCE(m.material_points, 0) AS material_points,
      COALESCE(s.subject_points, 0) AS subject_points
    FROM flashcard_scores f
    FULL OUTER JOIN material_scores m ON m.user_id = f.user_id
    FULL OUTER JOIN subject_scores s ON s.user_id = COALESCE(f.user_id, m.user_id)
  )
  SELECT
    c.user_id,
    p.display_name,
    (c.flashcard_points + c.material_points + c.subject_points) AS total_score,
    c.flashcard_count,
    c.material_count,
    c.subject_count
  FROM combined c
  JOIN profiles p ON p.user_id = c.user_id
  WHERE p.display_name IS NOT NULL
    AND btrim(p.display_name) <> ''
    AND (c.flashcard_points + c.material_points + c.subject_points) > 0
  ORDER BY
    total_score        DESC,
    c.flashcard_points DESC,
    c.material_points  DESC,
    c.subject_points   DESC,
    c.flashcard_count  DESC,
    c.material_count   DESC,
    c.subject_count    DESC,
    p.display_name     ASC
  LIMIT GREATEST(COALESCE(entry_limit, 10), 1);
$function$;

CREATE OR REPLACE FUNCTION public.get_public_profile_stats(profile_user_id uuid)
RETURNS TABLE(
  flashcard_count bigint,
  material_count bigint,
  subject_count bigint,
  subject_comment_count bigint,
  teacher_review_count bigint,
  approved_score bigint,
  total_xp integer,
  level integer,
  level_progress_xp integer,
  next_level_xp integer
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  WITH contribution_counts AS (
    SELECT
      (
        SELECT COUNT(*)::bigint
        FROM flashcard_decks d
        WHERE d.creator_id = profile_user_id
          AND d.is_public = true
      ) AS flashcard_count,
      (
        SELECT COALESCE(
          SUM(
            CASE
              WHEN d.card_count <= 50 THEN 1
              WHEN d.card_count <= 100 THEN 2
              ELSE 3
            END
          ),
          0
        )::bigint
        FROM flashcard_decks d
        WHERE d.creator_id = profile_user_id
          AND d.is_public = true
      ) AS flashcard_points,
      (
        SELECT COUNT(*)::bigint
        FROM subject_materials m
        WHERE m.uploader_id = profile_user_id
          AND m.moderation_status = 'approved'
      ) AS material_count,
      (
        SELECT COALESCE(
          SUM(
            CASE
              WHEN COALESCE(m.page_count, 0) < 5 THEN 0
              WHEN m.page_count <= 15 THEN 2
              ELSE 3
            END
          ),
          0
        )::bigint
        FROM subject_materials m
        WHERE m.uploader_id = profile_user_id
          AND m.moderation_status = 'approved'
      ) AS material_points,
      (
        SELECT COUNT(*)::bigint
        FROM subject_proposals sp
        JOIN subjects s ON s.id = sp.subject_id
        WHERE sp.proposed_by = profile_user_id
          AND sp.status = 'approved'
      ) AS subject_count,
      (
        SELECT COUNT(*)::bigint
        FROM subject_ratings sr
        WHERE sr.user_id = profile_user_id
          AND sr.comment_is_approved = true
          AND sr.comment IS NOT NULL
      ) AS subject_comment_count,
      (
        SELECT COUNT(*)::bigint
        FROM teacher_ratings tr
        WHERE tr.user_id = profile_user_id
          AND tr.comment_is_approved = true
          AND tr.review IS NOT NULL
      ) AS teacher_review_count
  ),
  score_calc AS (
    SELECT
      flashcard_count,
      material_count,
      subject_count,
      subject_comment_count,
      teacher_review_count,
      (
        flashcard_points
        + material_points
        + subject_count
        + subject_comment_count
        + teacher_review_count
      ) AS approved_score
    FROM contribution_counts
  )
  SELECT
    flashcard_count,
    material_count,
    subject_count,
    subject_comment_count,
    teacher_review_count,
    approved_score,
    (approved_score * 10)::integer             AS total_xp,
    ((approved_score * 10) / 100 + 1)::integer AS level,
    ((approved_score * 10) % 100)::integer     AS level_progress_xp,
    100                                        AS next_level_xp
  FROM score_calc;
$function$;
