-- Fonctions pour la page recherche pro : distance, prochaine disponibilité, filtre plage horaire
-- À coller dans le SQL Editor de Supabase et exécuter.
-- Rev2 : ajout de `bio` au retour de get_services_with_distance (panneau "en savoir plus").
-- Si tu as déjà exécuté une version précédente de ce fichier, ré-exécute-le entièrement :
-- le DROP FUNCTION ci-dessous gère le changement de type de retour automatiquement.
--
-- NB sur la précision de "disponibilité" : les services n'ont pas de durée fixe en base
-- (colonne `duration` absente), donc ces fonctions raisonnent au niveau du JOUR (un pro a-t-il
-- un créneau récurrent ce jour-là, et n'est-il pas bloqué par un calendar_block ce jour-là),
-- pas au niveau du créneau horaire exact déjà réservé. Un pro déjà complet sur sa journée
-- peut donc apparaître comme "disponible" tant qu'il reste dans son jour récurrent ouvert.
-- À affiner si on ajoute une durée de prestation aux services.

-- 1. Recherche par distance (recréée pour garantir qu'elle existe et fonctionne).
--    La fonction existait déjà avec une autre forme de retour — Postgres refuse de la
--    remplacer dans ce cas, on la supprime explicitement avant de la recréer.
DROP FUNCTION IF EXISTS public.get_services_with_distance(
  double precision, double precision, double precision, text, text, text, text, numeric, numeric
);

CREATE OR REPLACE FUNCTION public.get_services_with_distance(
  user_lat double precision,
  user_lng double precision,
  radius_km double precision,
  search_query text DEFAULT NULL,
  selected_category text DEFAULT NULL,
  selected_subcategory text DEFAULT NULL,
  selected_sub_subcategory text DEFAULT NULL,
  max_price numeric DEFAULT NULL,
  min_price numeric DEFAULT NULL
)
RETURNS TABLE (
  id uuid, title text, title_en text, title_de text,
  description text, description_en text, description_de text,
  price numeric, price_unit text,
  category text, subcategory text, sub_subcategory text,
  allow_home boolean, allow_store boolean, is_active boolean, created_at timestamptz,
  cover_image_url text,
  user_id uuid, full_name text, avatar_url text, location text, bio text,
  languages text[], avg_rating numeric, review_count integer,
  latitude double precision, longitude double precision,
  store_name text, show_on_map boolean,
  distance_km double precision
)
LANGUAGE sql STABLE
AS $$
  WITH base AS (
    SELECT
      s.id, s.title, s.title_en, s.title_de,
      s.description, s.description_en, s.description_de,
      s.price, s.price_unit,
      s.category, s.subcategory, s.sub_subcategory,
      s.allow_home, s.allow_store, s.is_active, s.created_at,
      s.cover_image_url,
      p.id AS user_id, p.full_name, p.avatar_url, p.location, p.bio,
      p.languages, p.avg_rating, p.review_count,
      p.latitude, p.longitude,
      p.store_name, p.show_on_map,
      (
        6371 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians(user_lat)) * cos(radians(p.latitude)) *
            cos(radians(p.longitude) - radians(user_lng)) +
            sin(radians(user_lat)) * sin(radians(p.latitude))
          ))
        )
      ) AS distance_km
    FROM services s
    JOIN profiles p ON p.id = s.user_id
    WHERE s.is_active = true
      AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
      AND (search_query IS NULL OR search_query = '' OR (
        s.title ILIKE '%' || search_query || '%' OR
        s.description ILIKE '%' || search_query || '%' OR
        s.title_en ILIKE '%' || search_query || '%' OR
        s.title_de ILIKE '%' || search_query || '%' OR
        s.description_en ILIKE '%' || search_query || '%' OR
        s.description_de ILIKE '%' || search_query || '%'
      ))
      AND (selected_category IS NULL OR s.category = selected_category)
      AND (selected_subcategory IS NULL OR s.subcategory = selected_subcategory)
      AND (selected_sub_subcategory IS NULL OR s.sub_subcategory = selected_sub_subcategory)
      AND (max_price IS NULL OR s.price <= max_price)
      AND (min_price IS NULL OR s.price >= min_price)
  )
  SELECT * FROM base
  WHERE distance_km <= radius_km
  ORDER BY distance_km ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_services_with_distance(
  double precision, double precision, double precision, text, text, text, text, numeric, numeric
) TO anon, authenticated;

-- 2. Prochaine date disponible par pro (jour avec un créneau récurrent ouvert,
--    et non couvert par un calendar_block) — appel groupé pour éviter le N+1 côté frontend
CREATE OR REPLACE FUNCTION public.get_next_available_dates(
  p_pro_ids uuid[],
  p_horizon_days int DEFAULT 60
)
RETURNS TABLE (pro_id uuid, next_available_date date)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_pro uuid;
  v_day date;
  v_found date;
  v_dow int;
  v_has_slot boolean;
  v_blocked boolean;
  i int;
BEGIN
  FOREACH v_pro IN ARRAY p_pro_ids LOOP
    v_found := NULL;
    FOR i IN 0..p_horizon_days LOOP
      v_day := CURRENT_DATE + i;
      v_dow := EXTRACT(DOW FROM v_day)::int;

      SELECT EXISTS (
        SELECT 1 FROM availability_slots a
        WHERE a.pro_id = v_pro AND a.day_of_week = v_dow
      ) INTO v_has_slot;

      IF v_has_slot THEN
        SELECT EXISTS (
          SELECT 1 FROM calendar_blocks cb
          WHERE cb.pro_id = v_pro
            AND cb.starts_at::date <= v_day AND cb.ends_at::date >= v_day
        ) INTO v_blocked;

        IF NOT v_blocked THEN
          v_found := v_day;
          EXIT;
        END IF;
      END IF;
    END LOOP;

    pro_id := v_pro;
    next_available_date := v_found;
    RETURN NEXT;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_next_available_dates(uuid[], int) TO anon, authenticated;

-- 3. Pros ayant un créneau récurrent ouvrant sur la plage demandée (filtre "jour + heure")
CREATE OR REPLACE FUNCTION public.get_available_pro_ids_in_range(
  p_date_from date,
  p_date_to date,
  p_time_start time DEFAULT NULL,
  p_time_end time DEFAULT NULL
)
RETURNS TABLE (pro_id uuid)
LANGUAGE sql STABLE
AS $$
  WITH days AS (
    SELECT DISTINCT EXTRACT(DOW FROM d)::int AS dow
    FROM generate_series(p_date_from, LEAST(p_date_to, p_date_from + 13), interval '1 day') d
  )
  SELECT DISTINCT a.pro_id
  FROM availability_slots a
  JOIN days ON days.dow = a.day_of_week
  WHERE (p_time_start IS NULL OR a.slot_end > p_time_start)
    AND (p_time_end IS NULL OR a.slot_start < p_time_end)
    AND NOT EXISTS (
      SELECT 1 FROM calendar_blocks cb
      WHERE cb.pro_id = a.pro_id
        AND cb.starts_at::date <= p_date_from
        AND cb.ends_at::date   >= p_date_to
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_available_pro_ids_in_range(date, date, time, time) TO anon, authenticated;
