// Suppression de compte conforme RGPD
// - Anonymise les données personnelles (conserve l'historique des réservations)
// - Désactive les services pro
// - Supprime l'utilisateur auth (empêche toute reconnexion)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // Vérifier l'identité via le JWT du header Authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

    const userId = user.id;

    // Client admin pour les opérations privilégiées
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 1. Anonymiser le profil (les réservations gardent une trace "Compte supprimé")
    await supabaseAdmin.from('profiles').update({
      full_name:    'Compte supprimé',
      first_name:   null,
      last_name:    null,
      bio:          null,
      avatar_url:   null,
      location:     null,
      phone:        null,
      company_name: null,
      latitude:     null,
      longitude:    null,
      store_name:   null,
      deleted_at:   new Date().toISOString(),
    }).eq('id', userId);

    // 2. Désactiver et dépublier tous les services du pro
    await supabaseAdmin.from('services')
      .update({ is_active: false })
      .eq('user_id', userId);

    // 3. Supprimer les photos de portfolio
    await supabaseAdmin.from('portfolio_images').delete().eq('user_id', userId);

    // 4. Supprimer les conversations et messages (données personnelles)
    const { data: convs } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .or(`client_id.eq.${userId},pro_id.eq.${userId}`);
    if (convs?.length) {
      const convIds = convs.map((c: { id: string }) => c.id);
      await supabaseAdmin.from('messages').delete().in('conversation_id', convIds);
      await supabaseAdmin.from('conversations').delete().in('id', convIds);
    }

    // 5. Supprimer les favoris
    await supabaseAdmin.from('favorites').delete()
      .or(`client_id.eq.${userId},pro_id.eq.${userId}`);

    // 6. Supprimer l'utilisateur auth — empêche toute reconnexion
    //    (le profil shell reste pour préserver l'historique des réservations)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[delete-account]', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
