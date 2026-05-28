-- Ochrana před modifikací sloupce comment_is_approved běžnými uživateli
CREATE OR REPLACE FUNCTION protect_comment_is_approved()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.comment_is_approved IS DISTINCT FROM OLD.comment_is_approved THEN
    IF COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') NOT IN ('admin', 'moderator') THEN
      RAISE EXCEPTION 'Nedostatečná oprávnění: Pouze administrátor nebo moderátor může měnit stav schválení.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_subject_ratings ON subject_ratings;
CREATE TRIGGER trg_protect_subject_ratings
BEFORE UPDATE ON subject_ratings
FOR EACH ROW EXECUTE FUNCTION protect_comment_is_approved();

DROP TRIGGER IF EXISTS trg_protect_teacher_ratings ON teacher_ratings;
CREATE TRIGGER trg_protect_teacher_ratings
BEFORE UPDATE ON teacher_ratings
FOR EACH ROW EXECUTE FUNCTION protect_comment_is_approved();
