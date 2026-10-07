-- Le palier d'abonnement détermine désormais la commission prélevée (create-payment-intent).
-- Il ne doit donc changer que côté serveur, après paiement vérifié (update-subscription, stripe-webhooks).
-- Avant : un pro pouvait passer lui-même en 'plus' via supabase.from('profiles').update(...).

CREATE OR REPLACE FUNCTION public.protect_subscription_tier()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.subscription_tier := 'essential';
    ELSIF NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier THEN
      RAISE EXCEPTION 'Le palier d''abonnement ne se modifie que côté serveur, après paiement'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_subscription_tier ON public.profiles;
CREATE TRIGGER protect_subscription_tier
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_subscription_tier();
