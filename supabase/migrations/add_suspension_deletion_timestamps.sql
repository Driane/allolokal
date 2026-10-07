-- Horodatage des suspensions/suppressions de compte — pour KPI admin
-- À coller dans le SQL Editor de Supabase et exécuter

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at   TIMESTAMPTZ;
