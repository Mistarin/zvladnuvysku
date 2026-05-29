CREATE TABLE IF NOT EXISTS profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_display_name_length CHECK (
    display_name IS NULL OR char_length(btrim(display_name)) BETWEEN 2 AND 40
  )
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Veřejné čtení profilů" ON profiles;
CREATE POLICY "Veřejné čtení profilů"
  ON profiles FOR SELECT TO public
  USING (display_name IS NOT NULL AND btrim(display_name) <> '');

DROP POLICY IF EXISTS "Uživatel čte svůj profil" ON profiles;
CREATE POLICY "Uživatel čte svůj profil"
  ON profiles FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Uživatel vloží svůj profil" ON profiles;
CREATE POLICY "Uživatel vloží svůj profil"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Uživatel upraví svůj profil" ON profiles;
CREATE POLICY "Uživatel upraví svůj profil"
  ON profiles FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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
    WHERE m.is_approved = true
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

GRANT EXECUTE ON FUNCTION get_hall_of_fame(text, integer) TO anon, authenticated;
