-- Seed: réservations de démo pour le pro g@g.g
-- Clients = faux profils du seed_fake_pros.sql
-- Couvre tous les statuts : pending / confirmed / completed / cancelled / disputed

DO $$
DECLARE
  v_pro_id   uuid;
  v_svc      uuid[];
BEGIN
  -- Récupérer l'UUID du pro demo
  SELECT id INTO v_pro_id FROM auth.users WHERE email = 'g@g.g';
  IF v_pro_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur g@g.g introuvable';
  END IF;

  -- Récupérer ses 4 premiers services actifs
  SELECT ARRAY(
    SELECT id FROM public.services
    WHERE user_id = v_pro_id AND is_active = true
    ORDER BY created_at
    LIMIT 4
  ) INTO v_svc;

  IF array_length(v_svc, 1) IS NULL THEN
    RAISE EXCEPTION 'Aucun service actif trouvé pour g@g.g — créez-en d''abord.';
  END IF;

  INSERT INTO public.bookings
    (id, pro_id, client_id, service_id, booking_date, status, total_price, is_recurring, recurrence_interval, created_at)
  VALUES
    -- PENDING — en attente de confirmation (futur proche)
    (gen_random_uuid(), v_pro_id, 'd277f169-9576-5902-856e-0923eeb25e49', v_svc[1],
     now() + interval '3 days',  'pending',   45.00, false, null, now() - interval '1 hour'),

    (gen_random_uuid(), v_pro_id, '0f01392c-40f4-5251-9184-3a36fd0c3e8c', v_svc[2],
     now() + interval '7 days',  'pending',   60.00, false, null, now() - interval '2 hours'),

    (gen_random_uuid(), v_pro_id, '53e752d0-d97a-549c-a71c-d03d5338b5e3', v_svc[1],
     now() + interval '12 days', 'pending',   45.00, true,  'weekly', now() - interval '30 minutes'),

    -- CONFIRMED — confirmées, à venir
    (gen_random_uuid(), v_pro_id, 'ce30b60b-e5b3-51f2-ba76-3f9440d7bb67', v_svc[3],
     now() + interval '2 days',  'confirmed', 80.00, false, null, now() - interval '3 days'),

    (gen_random_uuid(), v_pro_id, '71181eb6-3a11-5cdc-b4e0-b9146335c2ae', v_svc[2],
     now() + interval '9 days',  'confirmed', 60.00, false, null, now() - interval '5 days'),

    -- COMPLETED — terminées (passé)
    (gen_random_uuid(), v_pro_id, '20dc710f-5fc2-5be9-9aff-172e54bed682', v_svc[1],
     now() - interval '2 days',  'completed', 45.00, false, null, now() - interval '10 days'),

    (gen_random_uuid(), v_pro_id, 'd277f169-9576-5902-856e-0923eeb25e49', v_svc[4],
     now() - interval '7 days',  'completed', 95.00, false, null, now() - interval '14 days'),

    (gen_random_uuid(), v_pro_id, 'dc29538c-c689-5dbf-920b-8dd750905e00', v_svc[2],
     now() - interval '14 days', 'completed', 60.00, true,  'monthly', now() - interval '21 days'),

    (gen_random_uuid(), v_pro_id, 'fc418bab-698b-59fc-87a3-3f7fa03d4e47', v_svc[3],
     now() - interval '21 days', 'completed', 80.00, false, null, now() - interval '28 days'),

    -- CANCELLED — annulée
    (gen_random_uuid(), v_pro_id, '0f01392c-40f4-5251-9184-3a36fd0c3e8c', v_svc[1],
     now() - interval '10 days', 'cancelled', 45.00, false, null, now() - interval '15 days'),

    -- DISPUTED — en litige
    (gen_random_uuid(), v_pro_id, 'a7296813-72a4-5178-8d55-9fefe9c3d28b', v_svc[2],
     now() - interval '4 days',  'disputed',  60.00, false, null, now() - interval '6 days');

  RAISE NOTICE 'Réservations créées pour le pro % (g@g.g)', v_pro_id;
END $$;
