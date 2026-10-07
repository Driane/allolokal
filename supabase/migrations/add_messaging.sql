-- ── Messagerie VaMeni ──────────────────────────────────────────────────────
-- Run this in the Supabase SQL Editor

-- 1. Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pro_id            uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message      text,
  last_message_at   timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, pro_id)
);

-- 2. Messages
CREATE TABLE IF NOT EXISTS messages (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content           text NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 2000),
  read_at           timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- 3. Index for performance
CREATE INDEX IF NOT EXISTS idx_conversations_client   ON conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_pro      ON conversations(pro_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation  ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_unread        ON messages(conversation_id, sender_id) WHERE read_at IS NULL;

-- 4. Trigger : update last_message on conversations
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message    = LEFT(NEW.content, 120),
      last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_conversation ON messages;
CREATE TRIGGER trg_update_conversation
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- 5. Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages      ENABLE ROW LEVEL SECURITY;

-- Conversations : visible uniquement par les deux participants
DROP POLICY IF EXISTS "conv_select" ON conversations;
CREATE POLICY "conv_select" ON conversations FOR SELECT
  USING (auth.uid() = client_id OR auth.uid() = pro_id);

DROP POLICY IF EXISTS "conv_insert" ON conversations;
CREATE POLICY "conv_insert" ON conversations FOR INSERT
  WITH CHECK (auth.uid() = client_id OR auth.uid() = pro_id);

-- Messages : visible uniquement par les membres de la conversation
DROP POLICY IF EXISTS "msg_select" ON messages;
CREATE POLICY "msg_select" ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (c.client_id = auth.uid() OR c.pro_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "msg_insert" ON messages;
CREATE POLICY "msg_insert" ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (c.client_id = auth.uid() OR c.pro_id = auth.uid())
    )
  );

-- Marquer comme lu : seulement le destinataire peut le faire
DROP POLICY IF EXISTS "msg_update_read" ON messages;
CREATE POLICY "msg_update_read" ON messages FOR UPDATE
  USING (
    sender_id != auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (c.client_id = auth.uid() OR c.pro_id = auth.uid())
    )
  )
  WITH CHECK (read_at IS NOT NULL);

-- 6. Realtime (activer la réplication pour ces tables)
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
