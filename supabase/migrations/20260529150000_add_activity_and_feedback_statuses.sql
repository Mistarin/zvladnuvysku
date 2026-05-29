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
SET
  moderation_status = CASE
    WHEN is_approved = true THEN 'approved'
    ELSE 'pending'
  END,
  rejection_reason = CASE
    WHEN is_approved = true THEN NULL
    ELSE rejection_reason
  END
WHERE moderation_status IS DISTINCT FROM CASE
  WHEN is_approved = true THEN 'approved'
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

DROP POLICY IF EXISTS "Uživatel čte svůj feedback" ON feedback;
CREATE POLICY "Uživatel čte svůj feedback"
  ON feedback FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Uploader čte své materiály" ON subject_materials;
CREATE POLICY "Uploader čte své materiály"
  ON subject_materials FOR SELECT TO authenticated
  USING ((select auth.uid()) = uploader_id);
