-- Blocage et signalement d'utilisateur — requis pour la conformité Google Play / App Store
-- des apps avec contenu généré par les utilisateurs (messagerie, avis).
-- À coller dans le SQL Editor de Supabase et exécuter

CREATE TABLE IF NOT EXISTS public.blocked_users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blocked_users' AND policyname = 'Users manage their own blocks') THEN
    CREATE POLICY "Users manage their own blocks" ON public.blocked_users
      FOR ALL TO authenticated
      USING (blocker_id = auth.uid())
      WITH CHECK (blocker_id = auth.uid());
  END IF;
END $$;

-- Un utilisateur doit pouvoir savoir si IL a été bloqué par quelqu'un d'autre
-- (pour désactiver l'envoi de messages dans ce sens aussi), sans voir tous les blocages.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blocked_users' AND policyname = 'Users can see if they are blocked') THEN
    CREATE POLICY "Users can see if they are blocked" ON public.blocked_users
      FOR SELECT TO authenticated
      USING (blocked_id = auth.uid());
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  reason          TEXT NOT NULL,
  details         TEXT,
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_reports' AND policyname = 'Users can create reports') THEN
    CREATE POLICY "Users can create reports" ON public.user_reports
      FOR INSERT TO authenticated
      WITH CHECK (reporter_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_reports' AND policyname = 'Users can see their own reports') THEN
    CREATE POLICY "Users can see their own reports" ON public.user_reports
      FOR SELECT TO authenticated
      USING (reporter_id = auth.uid());
  END IF;
END $$;

-- NB : pas encore d'interface admin pour consulter user_reports (comme pour les litiges
-- au démarrage) — à construire dès que ce flux aura été validé côté client.
