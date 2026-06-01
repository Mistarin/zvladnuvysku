CREATE TABLE IF NOT EXISTS public.activity_acknowledgements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type text NOT NULL,
  item_id text NOT NULL,
  state_token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT activity_acknowledgements_item_type_length CHECK (char_length(item_type) BETWEEN 1 AND 64),
  CONSTRAINT activity_acknowledgements_item_id_length CHECK (char_length(item_id) BETWEEN 1 AND 128),
  CONSTRAINT activity_acknowledgements_state_token_length CHECK (char_length(state_token) BETWEEN 1 AND 512),
  CONSTRAINT activity_acknowledgements_user_item_state_unique UNIQUE (user_id, item_type, item_id, state_token)
);

CREATE INDEX IF NOT EXISTS activity_acknowledgements_user_idx
  ON public.activity_acknowledgements (user_id, item_type, item_id);

ALTER TABLE public.activity_acknowledgements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_acknowledgements_select" ON public.activity_acknowledgements;
DROP POLICY IF EXISTS "activity_acknowledgements_insert" ON public.activity_acknowledgements;
DROP POLICY IF EXISTS "activity_acknowledgements_delete" ON public.activity_acknowledgements;

CREATE POLICY "activity_acknowledgements_select"
  ON public.activity_acknowledgements
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "activity_acknowledgements_insert"
  ON public.activity_acknowledgements
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "activity_acknowledgements_delete"
  ON public.activity_acknowledgements
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

NOTIFY pgrst, 'reload schema';
