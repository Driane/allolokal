-- ── Restreindre la messagerie aux réservations actives ──────────────────────
-- À coller dans le SQL Editor Supabase APRÈS add_messaging.sql

-- 1. Conversations : on ne peut en créer que s'il existe une réservation active
--    (status != 'cancelled') entre les deux parties.
DROP POLICY IF EXISTS "conv_insert" ON conversations;
CREATE POLICY "conv_insert" ON conversations FOR INSERT
  WITH CHECK (
    (auth.uid() = client_id OR auth.uid() = pro_id)
    AND EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.client_id = client_id   -- NEW.client_id
        AND b.pro_id   = pro_id       -- NEW.pro_id
        AND b.status  <> 'cancelled'
    )
  );

-- 2. Messages : on ne peut en envoyer que si la conversation a une réservation active.
DROP POLICY IF EXISTS "msg_insert" ON messages;
CREATE POLICY "msg_insert" ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (c.client_id = auth.uid() OR c.pro_id = auth.uid())
        AND EXISTS (
          SELECT 1 FROM bookings b
          WHERE b.client_id = c.client_id
            AND b.pro_id   = c.pro_id
            AND b.status  <> 'cancelled'
        )
    )
  );
