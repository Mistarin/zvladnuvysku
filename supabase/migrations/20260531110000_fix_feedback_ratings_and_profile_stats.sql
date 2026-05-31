ALTER TABLE subject_materials
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS moderated_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'subject_materials_moderation_status_check'
  ) THEN
    ALTER TABLE subject_materials
      ADD CONSTRAINT subject_materials_moderation_status_check
      CHECK (moderation_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

UPDATE subject_materials
SET moderation_status = CASE
  WHEN moderation_status = 'approved' THEN 'approved'
  WHEN moderation_status = 'rejected' THEN 'rejected'
  WHEN COALESCE(is_approved, false) = true THEN 'approved'
  ELSE 'pending'
END
WHERE moderation_status IS DISTINCT FROM CASE
  WHEN moderation_status = 'approved' THEN 'approved'
  WHEN moderation_status = 'rejected' THEN 'rejected'
  WHEN COALESCE(is_approved, false) = true THEN 'approved'
  ELSE 'pending'
END;

ALTER TABLE feedback
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS source_id uuid,
  ADD COLUMN IF NOT EXISTS source_label text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'feedback_status_check'
  ) THEN
    ALTER TABLE feedback
      ADD CONSTRAINT feedback_status_check
      CHECK (status IN ('new', 'in_progress', 'resolved'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'feedback_source_type_check'
  ) THEN
    ALTER TABLE feedback
      ADD CONSTRAINT feedback_source_type_check
      CHECK (source_type IS NULL OR source_type IN ('general', 'material', 'subject_rating', 'teacher_rating'));
  END IF;
END $$;

UPDATE feedback
SET status = CASE
  WHEN is_resolved = true THEN 'resolved'
  ELSE 'new'
END
WHERE status IS DISTINCT FROM CASE
  WHEN is_resolved = true THEN 'resolved'
  ELSE 'new'
END;

DROP TRIGGER IF EXISTS trg_feedback_updated_at ON feedback;
CREATE TRIGGER trg_feedback_updated_at
  BEFORE UPDATE ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION update_rating_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_subject_id uuid;
  v_avg_overall numeric;
  v_avg_difficulty numeric;
  v_avg_usefulness numeric;
  v_avg_workload numeric;
  v_count integer;
BEGIN
  v_subject_id := COALESCE(NEW.subject_id, OLD.subject_id);

  IF v_subject_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM subjects WHERE id = v_subject_id) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT
    ROUND(AVG(overall)::numeric, 2),
    ROUND(AVG(difficulty)::numeric, 2),
    ROUND(AVG(usefulness)::numeric, 2),
    ROUND(AVG(workload)::numeric, 2),
    COUNT(*)
  INTO v_avg_overall, v_avg_difficulty, v_avg_usefulness, v_avg_workload, v_count
  FROM subject_ratings
  WHERE subject_id = v_subject_id;

  INSERT INTO subject_rating_stats (
    subject_id,
    avg_overall,
    avg_difficulty,
    avg_usefulness,
    avg_workload,
    total_ratings,
    updated_at
  )
  VALUES (
    v_subject_id,
    COALESCE(v_avg_overall, 0),
    COALESCE(v_avg_difficulty, 0),
    COALESCE(v_avg_usefulness, 0),
    COALESCE(v_avg_workload, 0),
    COALESCE(v_count, 0),
    now()
  )
  ON CONFLICT (subject_id) DO UPDATE SET
    avg_overall = EXCLUDED.avg_overall,
    avg_difficulty = EXCLUDED.avg_difficulty,
    avg_usefulness = EXCLUDED.avg_usefulness,
    avg_workload = EXCLUDED.avg_workload,
    total_ratings = EXCLUDED.total_ratings,
    updated_at = now();

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_rating_stats ON subject_ratings;
CREATE TRIGGER trg_update_rating_stats
AFTER INSERT OR UPDATE OR DELETE ON subject_ratings
FOR EACH ROW EXECUTE FUNCTION update_rating_stats();

CREATE OR REPLACE FUNCTION update_teacher_rating_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_teacher_id uuid;
  v_avg_rating numeric;
  v_count integer;
BEGIN
  v_teacher_id := COALESCE(NEW.teacher_id, OLD.teacher_id);

  IF v_teacher_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM teachers WHERE id = v_teacher_id) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT
    ROUND(AVG(rating)::numeric, 2),
    COUNT(*)
  INTO v_avg_rating, v_count
  FROM teacher_ratings
  WHERE teacher_id = v_teacher_id;

  INSERT INTO teacher_rating_stats (
    teacher_id,
    avg_rating,
    total_ratings,
    updated_at
  )
  VALUES (
    v_teacher_id,
    COALESCE(v_avg_rating, 0),
    COALESCE(v_count, 0),
    now()
  )
  ON CONFLICT (teacher_id) DO UPDATE SET
    avg_rating = EXCLUDED.avg_rating,
    total_ratings = EXCLUDED.total_ratings,
    updated_at = now();

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_teacher_rating_stats ON teacher_ratings;
CREATE TRIGGER trg_update_teacher_rating_stats
AFTER INSERT OR UPDATE OR DELETE ON teacher_ratings
FOR EACH ROW EXECUTE FUNCTION update_teacher_rating_stats();

DROP INDEX IF EXISTS idx_subject_materials_approved_title_trgm;
CREATE INDEX IF NOT EXISTS idx_subject_materials_approved_title_trgm
ON public.subject_materials
USING gin (title gin_trgm_ops)
WHERE moderation_status = 'approved';

CREATE OR REPLACE FUNCTION get_hall_of_fame(
  period_key text DEFAULT 'all',
  entry_limit integer DEFAULT 10
)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  total_score bigint,
  flashcard_count bigint,
  material_count bigint,
  subject_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH window_bounds AS (
    SELECT CASE period_key
      WHEN 'week' THEN now() - interval '7 days'
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
    SELECT
      sp.proposed_by AS user_id,
      COUNT(*)::bigint AS subject_count
    FROM subject_proposals sp
    CROSS JOIN window_bounds wb
    WHERE sp.status = 'approved'
      AND sp.type = 'new'
      AND (wb.start_at IS NULL OR sp.created_at >= wb.start_at)
    GROUP BY sp.proposed_by
  ),
  combined AS (
    SELECT
      COALESCE(f.user_id, m.user_id, s.user_id) AS user_id,
      COALESCE(f.flashcard_count, 0) AS flashcard_count,
      COALESCE(m.material_count, 0) AS material_count,
      COALESCE(s.subject_count, 0) AS subject_count
    FROM flashcard_scores f
    FULL OUTER JOIN material_scores m ON m.user_id = f.user_id
    FULL OUTER JOIN subject_scores s
      ON s.user_id = COALESCE(f.user_id, m.user_id)
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
    total_score DESC,
    c.flashcard_count DESC,
    c.material_count DESC,
    c.subject_count DESC,
    p.display_name ASC
  LIMIT GREATEST(COALESCE(entry_limit, 10), 1);
$$;

CREATE OR REPLACE FUNCTION get_public_profile_stats(profile_user_id uuid)
RETURNS TABLE (
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
SECURITY DEFINER
SET search_path = public
AS $$
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
        SELECT COUNT(*)::bigint
        FROM subject_proposals sp
        WHERE sp.proposed_by = profile_user_id
          AND sp.status = 'approved'
          AND sp.type = 'new'
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
    (approved_score * 10)::integer AS total_xp,
    ((approved_score * 10) / 100 + 1)::integer AS level,
    ((approved_score * 10) % 100)::integer AS level_progress_xp,
    100 AS next_level_xp
  FROM score_calc;
$$;

GRANT EXECUTE ON FUNCTION get_hall_of_fame(text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_public_profile_stats(uuid) TO anon, authenticated;
