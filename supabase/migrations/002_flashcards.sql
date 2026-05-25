-- Flashcard decky (kolekce karet pro předmět)
CREATE TABLE flashcard_decks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  is_public boolean DEFAULT false,
  card_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Jednotlivé flashkarty
CREATE TABLE flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id uuid NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,
  front text NOT NULL,
  back text NOT NULL,
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Progres učení (SM-2 spaced repetition algoritmus)
CREATE TABLE card_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  ease_factor numeric(4,2) DEFAULT 2.50 CHECK (ease_factor >= 1.3),
  interval_days integer DEFAULT 0,
  repetitions integer DEFAULT 0,
  due_date timestamptz DEFAULT now(),
  status text DEFAULT 'new' CHECK (status IN ('new', 'learning', 'review')),
  last_reviewed_at timestamptz,
  UNIQUE (user_id, card_id)
);

-- Automatický update card_count v decku
CREATE OR REPLACE FUNCTION update_deck_card_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE flashcard_decks SET card_count = card_count + 1, updated_at = now()
    WHERE id = NEW.deck_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE flashcard_decks SET card_count = GREATEST(card_count - 1, 0), updated_at = now()
    WHERE id = OLD.deck_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_flashcard_count
  AFTER INSERT OR DELETE ON flashcards
  FOR EACH ROW
  EXECUTE FUNCTION update_deck_card_count();

-- RLS politiky
ALTER TABLE flashcard_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_progress ENABLE ROW LEVEL SECURITY;

-- Veřejné decky čitelné pro všechny
CREATE POLICY "Veřejné decky" ON flashcard_decks
  FOR SELECT TO public USING (is_public = true);

CREATE POLICY "Vlastní decky" ON flashcard_decks
  FOR ALL TO authenticated
  USING ((select auth.uid()) = creator_id)
  WITH CHECK ((select auth.uid()) = creator_id);

CREATE POLICY "Karty z veřejných decků" ON flashcards
  FOR SELECT TO public
  USING (deck_id IN (SELECT id FROM flashcard_decks WHERE is_public = true));

CREATE POLICY "Vlastní karty" ON flashcards
  FOR ALL TO authenticated
  USING (deck_id IN (SELECT id FROM flashcard_decks WHERE creator_id = (select auth.uid())));

CREATE POLICY "Vlastní progres" ON card_progress
  FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
