-- Pause automatique du compte pro lors de l'ouverture d'un litige,
-- et levée automatique de la pause à la résolution (AdminDisputes).
-- La colonne is_paused_for_dispute doit exister (ajout ci-dessous si besoin).
-- À coller dans le SQL Editor de Supabase et exécuter.

-- Colonne de pause dédiée aux litiges (distincte de is_suspended qui est volontaire)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_paused_for_dispute BOOLEAN NOT NULL DEFAULT FALSE;

-- Trigger : pause le compte pro quand une réservation passe à 'disputed'
CREATE OR REPLACE FUNCTION public.handle_booking_disputed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Ouverture d'un litige
  IF NEW.status = 'disputed' AND (OLD.status IS NULL OR OLD.status <> 'disputed') THEN
    UPDATE profiles SET is_paused_for_dispute = TRUE WHERE id = NEW.pro_id;
  END IF;

  -- Résolution d'un litige (verdict posé par l'admin)
  IF OLD.status = 'disputed' AND NEW.status <> 'disputed' AND NEW.dispute_resolution IS NOT NULL THEN
    -- Ne lève la pause que s'il n'y a plus d'autres litiges ouverts pour ce pro
    IF NOT EXISTS (
      SELECT 1 FROM bookings
      WHERE pro_id = NEW.pro_id AND status = 'disputed' AND id <> NEW.id
    ) THEN
      UPDATE profiles SET is_paused_for_dispute = FALSE WHERE id = NEW.pro_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_booking_dispute_change ON bookings;
CREATE TRIGGER on_booking_dispute_change
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION public.handle_booking_disputed();
