-- Apparition sur la carte activée par défaut pour les pros (demande associé)
-- À coller dans le SQL Editor de Supabase et exécuter

ALTER TABLE profiles
  ALTER COLUMN show_on_map SET DEFAULT TRUE;

UPDATE profiles
  SET show_on_map = TRUE
  WHERE role = 'pro' AND show_on_map = FALSE;
