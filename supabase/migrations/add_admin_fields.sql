-- ── Champs de modération admin sur les services ─────────────────────────────
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS admin_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (admin_status IN ('pending', 'approved', 'rejected', 'auto_approved')),
  ADD COLUMN IF NOT EXISTS admin_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_note TEXT;

CREATE INDEX IF NOT EXISTS idx_services_admin_status ON services (admin_status, created_at);

-- ── Champs optionnels sur profiles (si pas encore présents) ──────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS suspended   BOOLEAN NOT NULL DEFAULT FALSE;

-- ── RLS : Admins peuvent lire tous les profils ───────────────────────────────
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR auth.uid() = id
  );

-- ── RLS : Admins peuvent modifier n'importe quel profil ──────────────────────
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ── RLS : Admins peuvent lire tous les services ──────────────────────────────
-- (services.user_id = colonne du pro, pas pro_id)
DROP POLICY IF EXISTS "Admins can view all services" ON services;
CREATE POLICY "Admins can view all services"
  ON services FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR user_id = auth.uid()
    OR TRUE
  );

-- ── RLS : Admins peuvent mettre à jour n'importe quel service ────────────────
DROP POLICY IF EXISTS "Admins can update any service" ON services;
CREATE POLICY "Admins can update any service"
  ON services FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ── RLS : Admins peuvent lire toutes les réservations ───────────────────────
-- (bookings.pro_id ET bookings.client_id existent bien)
DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;
CREATE POLICY "Admins can view all bookings"
  ON bookings FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR client_id = auth.uid()
    OR pro_id    = auth.uid()
  );

-- ── RLS : Admins peuvent lire tous les avis ──────────────────────────────────
-- (reviews.client_id ET reviews.pro_id, pas reviewer_id/reviewee_id)
DROP POLICY IF EXISTS "Admins can view all reviews" ON reviews;
CREATE POLICY "Admins can view all reviews"
  ON reviews FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR client_id = auth.uid()
    OR pro_id    = auth.uid()
  );

-- ── RLS : Admins peuvent supprimer les avis ──────────────────────────────────
DROP POLICY IF EXISTS "Admins can delete any review" ON reviews;
CREATE POLICY "Admins can delete any review"
  ON reviews FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
