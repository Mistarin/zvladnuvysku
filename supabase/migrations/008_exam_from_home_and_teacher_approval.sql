-- 1. Zkouška z domova
ALTER TABLE subjects ADD COLUMN exam_from_home boolean DEFAULT false;

-- 2. Schvalování učitelů
ALTER TABLE teachers ADD COLUMN is_approved boolean DEFAULT true;

-- Vynutíme RLS update pro učitele (vytvoření nového učitele neschváleného)
-- Pokud chceme aby mohl přidávat i běžný uživatel s is_approved = false
-- Ale my to budeme dělat přes Server Action s service_role (nebo override), 
-- takže RLS se měnit pro INSERT public nutně nemusí, pokud server action používá admin práva.
-- Jen musíme zajistit, aby běžní uživatelé přes public četli jen is_approved = true.

DROP POLICY IF EXISTS "Veřejné čtení učitelů" ON teachers;
CREATE POLICY "Veřejné čtení učitelů" 
  ON teachers FOR SELECT 
  TO public 
  USING (
    is_approved = true OR 
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'moderator')
  );
