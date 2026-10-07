-- Webhook : email de bienvenue à la création d'un profil
SELECT supabase_functions.http_request(
  'https://lpyrkawzqdlhvvgcwvod.supabase.co/functions/v1/send-welcome',
  'POST',
  '{"Content-Type":"application/json","Authorization":"Bearer <SUPABASE_PUBLISHABLE_KEY>"}',
  '{}',
  '1000'
) WHERE FALSE; -- placeholder, le vrai trigger est créé ci-dessous

CREATE OR REPLACE FUNCTION public.trigger_send_welcome()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM net.http_post(
    url     := 'https://lpyrkawzqdlhvvgcwvod.supabase.co/functions/v1/send-welcome',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer <SUPABASE_PUBLISHABLE_KEY>'
    ),
    body    := jsonb_build_object('record', row_to_json(NEW))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_send_welcome ON public.profiles;
CREATE TRIGGER on_profile_created_send_welcome
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.trigger_send_welcome();
