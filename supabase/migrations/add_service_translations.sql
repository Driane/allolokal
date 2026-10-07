-- Migration: traductions multilingues des offres pros
-- Coller dans le SQL Editor de Supabase

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS title_en       TEXT,
  ADD COLUMN IF NOT EXISTS title_de       TEXT,
  ADD COLUMN IF NOT EXISTS description_en TEXT,
  ADD COLUMN IF NOT EXISTS description_de TEXT,
  ADD COLUMN IF NOT EXISTS original_lang  CHAR(2) NOT NULL DEFAULT 'hr';

-- Index pour accélérer les requêtes filtrées par langue
CREATE INDEX IF NOT EXISTS idx_services_original_lang ON services (original_lang);
