-- ── Champs litige dans bookings ─────────────────────────────────────────────
-- Coller dans Supabase SQL Editor

-- Champs créés côté client (DisputeModal) — s'ils n'existent pas encore
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS dispute_reason    text,
  ADD COLUMN IF NOT EXISTS disputed_at       timestamptz,
  ADD COLUMN IF NOT EXISTS disputed_by       uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Champs de résolution (côté admin)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS dispute_resolution   text,        -- 'client_won' | 'pro_won' | 'closed'
  ADD COLUMN IF NOT EXISTS dispute_admin_note   text,        -- note visible aux deux parties
  ADD COLUMN IF NOT EXISTS dispute_resolved_at  timestamptz,
  ADD COLUMN IF NOT EXISTS dispute_resolved_by  uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Index pour la page admin
CREATE INDEX IF NOT EXISTS idx_bookings_disputed
  ON bookings (status, disputed_at DESC)
  WHERE status = 'disputed';
