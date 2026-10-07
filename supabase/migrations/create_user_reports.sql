-- Table pour les signalements d'utilisateurs (modération)
-- Utilisée par MessagesPage.tsx via le menu "…" > Signaler

CREATE TABLE IF NOT EXISTS public.user_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  reason          TEXT NOT NULL,
  details         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_reports_reporter  ON public.user_reports (reporter_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reported  ON public.user_reports (reported_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_created   ON public.user_reports (created_at DESC);

ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

-- Un utilisateur peut créer un signalement le concernant en tant que reporter
DROP POLICY IF EXISTS "Users can insert own reports" ON public.user_reports;
CREATE POLICY "Users can insert own reports"
  ON public.user_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- Un utilisateur peut voir ses propres signalements
DROP POLICY IF EXISTS "Users can view own reports" ON public.user_reports;
CREATE POLICY "Users can view own reports"
  ON public.user_reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid());

-- Les admins peuvent tout lire
DROP POLICY IF EXISTS "Admins can view all reports" ON public.user_reports;
CREATE POLICY "Admins can view all reports"
  ON public.user_reports FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
