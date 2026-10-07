-- Normalise les valeurs obsolètes de la colonne services.category
-- vers les 6 catégories actives (beauty, home, cleaning, wellbeing, family, premium).
-- Contexte : des services créés avec une ancienne taxonomie ont des valeurs comme
-- 'home_works', 'electricity', 'premium_events', 'daily_life' qui ne correspondent
-- à aucune traduction ni aucun filtre dans l'interface actuelle.
-- À coller dans le SQL Editor de Supabase et exécuter.

UPDATE services SET category = 'home'    WHERE category IN ('home_works', 'electricity', 'plumbing', 'painting');
UPDATE services SET category = 'premium' WHERE category IN ('premium_events', 'events', 'daily_life', 'cooking');
UPDATE services SET category = 'cleaning' WHERE category IN ('housekeeping', 'cleaning_services');
UPDATE services SET category = 'beauty'   WHERE category IN ('beauty_services', 'hair', 'nails');
UPDATE services SET category = 'wellbeing' WHERE category IN ('wellness', 'sport', 'health');
UPDATE services SET category = 'family'   WHERE category IN ('childcare', 'eldercare', 'pet_care');

-- Vérification post-migration : doit retourner 0 lignes
-- SELECT category, COUNT(*) FROM services WHERE category NOT IN ('beauty','home','cleaning','wellbeing','family','premium') GROUP BY category;
