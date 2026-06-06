ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS legal_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS legal_accepted_version text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_legal_accepted_version_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_legal_accepted_version_check
  CHECK (
    legal_accepted_version IS NULL
    OR btrim(legal_accepted_version) <> ''
  );
