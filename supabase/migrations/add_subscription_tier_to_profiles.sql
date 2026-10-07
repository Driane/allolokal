-- Palier d'abonnement pro — étape 1 (donnée + affichage uniquement, pas de facturation Stripe Billing pour l'instant)
-- À coller dans le SQL Editor de Supabase et exécuter

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'essential'
    CHECK (subscription_tier IN ('essential', 'flex', 'plus'));
