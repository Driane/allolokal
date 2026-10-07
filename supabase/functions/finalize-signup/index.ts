// supabase/functions/finalize-signup/index.ts
// Appelée juste après supabase.auth.signUp() côté client.
// Utilise la service role pour : 1) persister les champs d'identité sur profiles
// (le client n'a pas encore de session active tant que l'email n'est pas confirmé),
// 2) tracer le consentement CGU/CGV (user_id + timestamp + version + IP — obligation légale).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, firstName, lastName, companyName, oib, phone, documentVersion } = await req.json()
    if (!userId || !documentVersion) {
      throw new Error('userId et documentVersion sont requis')
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('cf-connecting-ip')
      || null

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        first_name: firstName || null,
        last_name: lastName || null,
        company_name: companyName || null,
        oib: oib || null,
        phone: phone || null,
      })
      .eq('id', userId)
    if (profileError) throw profileError

    const { error: consentError } = await supabaseAdmin
      .from('consent_logs')
      .insert({ user_id: userId, document_version: documentVersion, ip })
    if (consentError) throw consentError

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
