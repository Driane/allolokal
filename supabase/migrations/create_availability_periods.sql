CREATE TABLE IF NOT EXISTS public.availability_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  location_type TEXT NOT NULL CHECK (location_type IN ('home', 'store', 'both')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.availability_periods ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'availability_periods' AND policyname = 'Pros manage own availability periods'
  ) THEN
    CREATE POLICY "Pros manage own availability periods"
      ON public.availability_periods FOR ALL TO authenticated
      USING (pro_id = auth.uid())
      WITH CHECK (pro_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'availability_periods' AND policyname = 'Availability periods publicly readable'
  ) THEN
    CREATE POLICY "Availability periods publicly readable"
      ON public.availability_periods FOR SELECT TO anon, authenticated
      USING (true);
  END IF;
END $$;
