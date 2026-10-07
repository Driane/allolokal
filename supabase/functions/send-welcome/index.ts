import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendEmail } from '../_shared/resend.ts';
import { welcomeTemplate, FROM } from '../_shared/templates.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }
  try {
    const payload = await req.json();
    const record = payload.record;
    if (!record) return new Response('no record', { status: 400, headers: cors });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: authUser } = await supabase.auth.admin.getUserById(record.id);
    const email = authUser?.user?.email;
    const name  = record.full_name || authUser?.user?.email?.split('@')[0] || 'là';
    const lang  = record.language || authUser?.user?.user_metadata?.language || null;

    if (!email) {
      console.warn('[send-welcome] no email for user', record.id);
      return new Response('no email', { status: 200, headers: cors });
    }

    const { subject, html } = welcomeTemplate(name, lang);
    await sendEmail({ from: FROM, to: email, subject, html });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[send-welcome]', err);
    return new Response(String(err), { status: 500, headers: cors });
  }
});
