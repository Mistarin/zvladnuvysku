CREATE OR REPLACE FUNCTION get_public_profile_subject_proposals(
  profile_user_id uuid,
  entry_limit integer DEFAULT 20
)
RETURNS TABLE (
  proposal_id uuid,
  proposal_type text,
  created_at timestamptz,
  subject_name text,
  subject_short_tag text,
  subject_slug text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    sp.id AS proposal_id,
    sp.type AS proposal_type,
    sp.created_at,
    COALESCE(
      NULLIF(btrim(s.name), ''),
      NULLIF(btrim(sp.data ->> 'name'), ''),
      NULLIF(btrim(sp.data ->> 'short_tag'), ''),
      'Schválený návrh'
    ) AS subject_name,
    COALESCE(
      NULLIF(btrim(s.short_tag), ''),
      NULLIF(btrim(sp.data ->> 'short_tag'), '')
    ) AS subject_short_tag,
    s.slug AS subject_slug
  FROM subject_proposals sp
  LEFT JOIN subjects s ON s.id = sp.subject_id
  WHERE sp.proposed_by = profile_user_id
    AND sp.status = 'approved'
  ORDER BY sp.created_at DESC
  LIMIT GREATEST(COALESCE(entry_limit, 20), 1);
$$;

GRANT EXECUTE ON FUNCTION get_public_profile_subject_proposals(uuid, integer) TO anon, authenticated;
