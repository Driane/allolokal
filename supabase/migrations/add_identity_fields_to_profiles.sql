-- Champs d'identité collectés à l'inscription (obligations légales + UX inscription)
-- À coller dans le SQL Editor de Supabase et exécuter

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS first_name   TEXT,
  ADD COLUMN IF NOT EXISTS last_name    TEXT,
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS oib          TEXT;
