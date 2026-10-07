-- Migration: champs carte et boutique sur les profils pros
-- À coller dans le SQL Editor de Supabase et exécuter

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS show_on_map BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS store_name  TEXT;

-- Optionnel : s'assurer que latitude et longitude existent aussi
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Index pour la requête de la page carte (filtre show_on_map + role)
CREATE INDEX IF NOT EXISTS idx_profiles_map
  ON profiles (show_on_map, role)
  WHERE show_on_map = TRUE;
