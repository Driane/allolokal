-- Migration : normalise les slugs legacy vers la taxonomie canonique du code
-- Validé le 2026-07-16 — exécuter dans le SQL Editor Supabase (pas via CLI)

-- ── SUBCATEGORY ──────────────────────────────────────────────────────────────
UPDATE services SET subcategory = 'cooking_meals'    WHERE subcategory = 'cooking';
UPDATE services SET subcategory = 'painting_coatings' WHERE subcategory = 'painting';

-- ── SUB_SUBCATEGORY (item) ───────────────────────────────────────────────────
UPDATE services SET sub_subcategory = 'relaxing_swedish' WHERE sub_subcategory = 'relaxing';
UPDATE services SET sub_subcategory = 'regular'           WHERE sub_subcategory = 'regular_cleaning';
UPDATE services SET sub_subcategory = 'outlets_cabling'   WHERE sub_subcategory = 'outlets_install';
UPDATE services SET sub_subcategory = 'private_concierge' WHERE sub_subcategory = 'personal_concierge';

-- wall_decor → interior (peinture intérieure) + force la sous-catégorie painting_coatings
UPDATE services
  SET subcategory = 'painting_coatings', sub_subcategory = 'interior'
  WHERE sub_subcategory = 'wall_decor';

-- disinfection (sub_subcategory) : intentionnellement ignoré — sera supprimé en prod
