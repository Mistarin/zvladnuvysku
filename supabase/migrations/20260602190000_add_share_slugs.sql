-- Migration: short share slugs for materials, material groups and flashcard decks
-- Created: 2026-06-02
-- Description: Adds stable short slugs used by public share URLs:
--              /m/{slug}, /s/{slug}, /k/{slug}

ALTER TABLE public.subject_materials
  ADD COLUMN IF NOT EXISTS share_slug text;

ALTER TABLE public.material_groups
  ADD COLUMN IF NOT EXISTS share_slug text;

ALTER TABLE public.flashcard_decks
  ADD COLUMN IF NOT EXISTS share_slug text;

CREATE OR REPLACE FUNCTION public.slugify_share_text(source text, fallback_prefix text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  normalized text;
BEGIN
  normalized := lower(coalesce(source, ''));

  normalized := replace(normalized, 'á', 'a');
  normalized := replace(normalized, 'ä', 'a');
  normalized := replace(normalized, 'â', 'a');
  normalized := replace(normalized, 'à', 'a');
  normalized := replace(normalized, 'ã', 'a');
  normalized := replace(normalized, 'å', 'a');
  normalized := replace(normalized, 'ā', 'a');
  normalized := replace(normalized, 'č', 'c');
  normalized := replace(normalized, 'ć', 'c');
  normalized := replace(normalized, 'ď', 'd');
  normalized := replace(normalized, 'é', 'e');
  normalized := replace(normalized, 'ě', 'e');
  normalized := replace(normalized, 'ë', 'e');
  normalized := replace(normalized, 'ê', 'e');
  normalized := replace(normalized, 'è', 'e');
  normalized := replace(normalized, 'ē', 'e');
  normalized := replace(normalized, 'í', 'i');
  normalized := replace(normalized, 'ï', 'i');
  normalized := replace(normalized, 'î', 'i');
  normalized := replace(normalized, 'ì', 'i');
  normalized := replace(normalized, 'ī', 'i');
  normalized := replace(normalized, 'ľ', 'l');
  normalized := replace(normalized, 'ĺ', 'l');
  normalized := replace(normalized, 'ň', 'n');
  normalized := replace(normalized, 'ñ', 'n');
  normalized := replace(normalized, 'ó', 'o');
  normalized := replace(normalized, 'ö', 'o');
  normalized := replace(normalized, 'ô', 'o');
  normalized := replace(normalized, 'ò', 'o');
  normalized := replace(normalized, 'õ', 'o');
  normalized := replace(normalized, 'ø', 'o');
  normalized := replace(normalized, 'ō', 'o');
  normalized := replace(normalized, 'ř', 'r');
  normalized := replace(normalized, 'ŕ', 'r');
  normalized := replace(normalized, 'š', 's');
  normalized := replace(normalized, 'ť', 't');
  normalized := replace(normalized, 'ú', 'u');
  normalized := replace(normalized, 'ů', 'u');
  normalized := replace(normalized, 'ü', 'u');
  normalized := replace(normalized, 'û', 'u');
  normalized := replace(normalized, 'ù', 'u');
  normalized := replace(normalized, 'ū', 'u');
  normalized := replace(normalized, 'ý', 'y');
  normalized := replace(normalized, 'ÿ', 'y');
  normalized := replace(normalized, 'ž', 'z');

  normalized := replace(normalized, ' ', '-');
  normalized := regexp_replace(normalized, '[^a-z0-9-]+', '-', 'g');
  normalized := regexp_replace(normalized, '-{2,}', '-', 'g');
  normalized := trim(both '-' from normalized);

  IF normalized = '' THEN
    normalized := fallback_prefix;
  END IF;

  RETURN left(normalized, 48);
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_unique_share_slug(
  requested_slug text,
  table_name text,
  row_id uuid
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  base_candidate text;
  candidate text;
  attempt integer := 0;
  exists_slug boolean := true;
BEGIN
  candidate := trim(both '-' from coalesce(requested_slug, ''));

  IF candidate = '' THEN
    candidate := substr(row_id::text, 1, 8);
  END IF;

  candidate := left(candidate, 48);
  base_candidate := candidate;

  WHILE exists_slug LOOP
    EXECUTE format(
      'SELECT EXISTS (
        SELECT 1
        FROM public.%I
        WHERE share_slug = $1
          AND id <> $2
      )',
      table_name
    )
    INTO exists_slug
    USING candidate, row_id;

    IF exists_slug THEN
      attempt := attempt + 1;
      candidate := left(trim(trailing '-' from base_candidate), 43) || '-' || substr(md5(row_id::text || ':' || attempt::text), 1, 4);
    END IF;
  END LOOP;

  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_subject_material_share_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug text;
BEGIN
  NEW.id := coalesce(NEW.id, gen_random_uuid());

  IF coalesce(NEW.share_slug, '') <> '' THEN
    NEW.share_slug := public.ensure_unique_share_slug(
      public.slugify_share_text(NEW.share_slug, 'material'),
      'subject_materials',
      NEW.id
    );
    RETURN NEW;
  END IF;

  base_slug := public.slugify_share_text(NEW.title, 'material');
  NEW.share_slug := public.ensure_unique_share_slug(base_slug, 'subject_materials', NEW.id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_material_group_share_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug text;
BEGIN
  NEW.id := coalesce(NEW.id, gen_random_uuid());

  IF coalesce(NEW.share_slug, '') <> '' THEN
    NEW.share_slug := public.ensure_unique_share_slug(
      public.slugify_share_text(NEW.share_slug, 'slozka'),
      'material_groups',
      NEW.id
    );
    RETURN NEW;
  END IF;

  base_slug := public.slugify_share_text(NEW.title, 'slozka');
  NEW.share_slug := public.ensure_unique_share_slug(base_slug, 'material_groups', NEW.id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_flashcard_deck_share_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug text;
BEGIN
  NEW.id := coalesce(NEW.id, gen_random_uuid());

  IF coalesce(NEW.share_slug, '') <> '' THEN
    NEW.share_slug := public.ensure_unique_share_slug(
      public.slugify_share_text(NEW.share_slug, 'balicek'),
      'flashcard_decks',
      NEW.id
    );
    RETURN NEW;
  END IF;

  base_slug := public.slugify_share_text(NEW.title, 'balicek');
  NEW.share_slug := public.ensure_unique_share_slug(base_slug, 'flashcard_decks', NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subject_materials_share_slug ON public.subject_materials;
CREATE TRIGGER trg_subject_materials_share_slug
  BEFORE INSERT OR UPDATE OF title, share_slug
  ON public.subject_materials
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_subject_material_share_slug();

DROP TRIGGER IF EXISTS trg_material_groups_share_slug ON public.material_groups;
CREATE TRIGGER trg_material_groups_share_slug
  BEFORE INSERT OR UPDATE OF title, share_slug
  ON public.material_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_material_group_share_slug();

DROP TRIGGER IF EXISTS trg_flashcard_decks_share_slug ON public.flashcard_decks;
CREATE TRIGGER trg_flashcard_decks_share_slug
  BEFORE INSERT OR UPDATE OF title, share_slug
  ON public.flashcard_decks
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_flashcard_deck_share_slug();

UPDATE public.subject_materials
SET share_slug = public.ensure_unique_share_slug(
  public.slugify_share_text(title, 'material'),
  'subject_materials',
  id
)
WHERE share_slug IS NULL;

UPDATE public.material_groups
SET share_slug = public.ensure_unique_share_slug(
  public.slugify_share_text(title, 'slozka'),
  'material_groups',
  id
)
WHERE share_slug IS NULL;

UPDATE public.flashcard_decks
SET share_slug = public.ensure_unique_share_slug(
  public.slugify_share_text(title, 'balicek'),
  'flashcard_decks',
  id
)
WHERE share_slug IS NULL;

ALTER TABLE public.subject_materials
  ALTER COLUMN share_slug SET NOT NULL;

ALTER TABLE public.material_groups
  ALTER COLUMN share_slug SET NOT NULL;

ALTER TABLE public.flashcard_decks
  ALTER COLUMN share_slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_subject_materials_share_slug_unique
  ON public.subject_materials (share_slug);

CREATE UNIQUE INDEX IF NOT EXISTS idx_material_groups_share_slug_unique
  ON public.material_groups (share_slug);

CREATE UNIQUE INDEX IF NOT EXISTS idx_flashcard_decks_share_slug_unique
  ON public.flashcard_decks (share_slug);
