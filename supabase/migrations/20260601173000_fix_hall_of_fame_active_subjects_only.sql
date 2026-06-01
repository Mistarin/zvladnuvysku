-- Fix hall-of-fame and profile stats to only count ACTIVE subjects (not deleted ones).
--
-- Previously both get_hall_of_fame() and get_public_profile_stats() counted all approved
-- subject_proposals of type='new' regardless of whether the resulting subject still exists.
-- This caused:
--   1. Deleted/removed subjects still contributing to leaderboard scores.
--   2. The subject_count in Hall of Fame not reflecting the real state of the DB.
--
-- Fix: add INNER JOIN subjects s ON s.id = sp.subject_id in the subject_scores CTE.
-- - If subject_id IS NULL (legacy proposals approved before subject_id was backfilled) → excluded.
-- - If subject_id references a deleted subject → excluded.
-- - Only active subjects in the subjects table are counted.
--
-- XP already awarded to users is NOT affected — XP lives separately in the profile/activity
-- system. Only the leaderboard display score and profile subject_count are corrected.

-- ─── Cleanup: remove orphaned approved proposals with no linked subject ────────
-- These are legacy test records approved before subject_id was consistently populated.
-- Removing them keeps the proposals table clean and avoids confusion in admin views.
DELETE FROM subject_proposals
WHERE status     = 'approved'
  AND type       = 'new'
  AND subject_id IS NULL;

-- ─── get_hall_of_fame ────────────────────────────────────────────────────────

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
      COUNT(*)::bigint AS flashcard_count
    FROM flashcards f
    JOIN flashcard_decks d ON d.id = f.deck_id
    CROSS JOIN window_bounds wb
    WHERE d.is_public = true
      AND (wb.start_at IS NULL OR f.created_at >= wb.start_at)
    GROUP BY d.creator_id
  ),
  material_scores AS (
    SELECT
      m.uploader_id AS user_id,
      COUNT(*)::bigint AS material_count
    FROM subject_materials m
    CROSS JOIN window_bounds wb
    WHERE m.moderation_status = 'approved'
      AND (wb.start_at IS NULL OR m.created_at >= wb.start_at)
    GROUP BY m.uploader_id
  ),
  subject_scores AS (
    -- INNER JOIN subjects ensures we only count proposals whose subject still exists.
    -- Proposals with subject_id IS NULL or a deleted subject_id are excluded.
    SELECT
      sp.proposed_by AS user_id,
      COUNT(*)::bigint AS subject_count
    FROM subject_proposals sp
    JOIN subjects s ON s.id = sp.subject_id
    CROSS JOIN window_bounds wb
    WHERE sp.status = 'approved'
      AND sp.type   = 'new'
      AND (wb.start_at IS NULL OR sp.created_at >= wb.start_at)
    GROUP BY sp.proposed_by
  ),
  combined AS (
    SELECT
      COALESCE(f.user_id, m.user_id, s.user_id) AS user_id,
      COALESCE(f.flashcard_count, 0) AS flashcard_count,
      COALESCE(m.material_count,  0) AS material_count,
      COALESCE(s.subject_count,   0) AS subject_count
    FROM flashcard_scores f
    FULL OUTER JOIN material_scores m ON m.user_id = f.user_id
    FULL OUTER JOIN subject_scores  s ON s.user_id = COALESCE(f.user_id, m.user_id)
  )
  SELECT
    c.user_id,
    p.display_name,
    (c.flashcard_count + c.material_count + c.subject_count) AS total_score,
    c.flashcard_count,
    c.material_count,
    c.subject_count
  FROM combined c
  JOIN profiles p ON p.user_id = c.user_id
  WHERE p.display_name IS NOT NULL
    AND btrim(p.display_name) <> ''
    AND (c.flashcard_count + c.material_count + c.subject_count) > 0
  ORDER BY
    total_score       DESC,
    c.flashcard_count DESC,
    c.material_count  DESC,
    c.subject_count   DESC,
    p.display_name    ASC
  LIMIT GREATEST(COALESCE(entry_limit, 10), 1);
$function$;

-- ─── get_public_profile_stats ────────────────────────────────────────────────

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
SET search_path TO 'public'
AS $function$
  WITH contribution_counts AS (
    SELECT
      (
        SELECT COUNT(*)::bigint
        FROM flashcards f
        JOIN flashcard_decks d ON d.id = f.deck_id
        WHERE d.creator_id = profile_user_id
          AND d.is_public = true
      ) AS flashcard_count,
      (
        SELECT COUNT(*)::bigint
        FROM subject_materials m
        WHERE m.uploader_id = profile_user_id
          AND m.moderation_status = 'approved'
      ) AS material_count,
      (
        -- Only proposals whose resulting subject still exists in the subjects table.
        SELECT COUNT(*)::bigint
        FROM subject_proposals sp
        JOIN subjects s ON s.id = sp.subject_id
        WHERE sp.proposed_by = profile_user_id
          AND sp.status = 'approved'
          AND sp.type   = 'new'
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
        flashcard_count
        + material_count
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
