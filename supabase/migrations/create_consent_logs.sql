-- Traçabilité du consentement CGU/CGV à l'inscription (obligation légale)
-- À coller dans le SQL Editor de Supabase et exécuter

CREATE TABLE IF NOT EXISTS consent_logs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_version  TEXT NOT NULL,
  ip                TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consent_logs_user_id ON consent_logs (user_id);

ALTER TABLE consent_logs ENABLE ROW LEVEL SECURITY;

-- Seul le service role (edge functions) écrit/lit cette table — pas d'accès direct côté client.
CREATE POLICY "service role only" ON consent_logs
  FOR ALL
  USING (false)
  WITH CHECK (false);
