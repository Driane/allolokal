-- Réservations créées uniquement côté serveur, après vérification du paiement Stripe.
-- Avant : BookingPage insérait la réservation depuis le navigateur avec payment_status = 'paid'
-- et un total_price fourni par le client. Désormais : confirm-booking / stripe-webhooks (service role).

-- 1. Lien réservation ↔ paiement : un paiement ne produit qu'une seule réservation (idempotence)
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_intent_id text;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_payment_intent_id_key
  ON public.bookings (payment_intent_id)
  WHERE payment_intent_id IS NOT NULL;

-- 2. Plus aucune création de réservation depuis le front (anon / authenticated).
--    Le service role (Edge Functions) n'est pas concerné.
REVOKE INSERT ON public.bookings FROM anon, authenticated;

-- 3. Le front peut toujours faire évoluer une réservation (statut, litige…),
--    mais plus son prix, son paiement ni ses participants.
CREATE OR REPLACE FUNCTION public.protect_booking_payment_fields()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') AND (
       NEW.total_price       IS DISTINCT FROM OLD.total_price
    OR NEW.payment_status    IS DISTINCT FROM OLD.payment_status
    OR NEW.payment_intent_id IS DISTINCT FROM OLD.payment_intent_id
    OR NEW.client_id         IS DISTINCT FROM OLD.client_id
    OR NEW.pro_id            IS DISTINCT FROM OLD.pro_id
    OR NEW.service_id        IS DISTINCT FROM OLD.service_id
  ) THEN
    RAISE EXCEPTION 'Prix, paiement et participants d''une réservation ne sont modifiables que côté serveur'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_booking_payment_fields ON public.bookings;
CREATE TRIGGER protect_booking_payment_fields
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.protect_booking_payment_fields();
