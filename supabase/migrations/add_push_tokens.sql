-- Table pour stocker les tokens FCM par utilisateur
CREATE TABLE IF NOT EXISTS push_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token      text NOT NULL,
  platform   text NOT NULL DEFAULT 'android', -- 'android' | 'ios'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Un utilisateur ne peut voir et gérer que ses propres tokens
DROP POLICY IF EXISTS "push_tokens_select" ON push_tokens;
CREATE POLICY "push_tokens_select" ON push_tokens FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "push_tokens_insert" ON push_tokens;
CREATE POLICY "push_tokens_insert" ON push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "push_tokens_delete" ON push_tokens;
CREATE POLICY "push_tokens_delete" ON push_tokens FOR DELETE
  USING (auth.uid() = user_id);
