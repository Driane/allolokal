-- Crée la colonne is_suspended et la synchronise avec l'ancienne colonne suspended.
-- Contexte : add_admin_fields.sql avait créé "suspended" mais ProfilePage.tsx
-- et le reste de l'app référençaient déjà "is_suspended" (qui n'existait pas en base).
-- Cette migration règle définitivement la cohérence.
-- À coller dans le SQL Editor de Supabase et exécuter.

-- 1. Créer la colonne is_suspended si elle n'existe pas
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Copier les valeurs de l'ancienne colonne suspended vers is_suspended
UPDATE profiles
  SET is_suspended = true
  WHERE suspended = true AND is_suspended = false;

-- 3. L'ancienne colonne "suspended" peut être conservée pour compatibilité descendante
-- ou supprimée manuellement une fois validé :
-- ALTER TABLE profiles DROP COLUMN IF EXISTS suspended;
