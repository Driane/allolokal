import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  // @ts-ignore
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VALID_TIERS = ['essential', 'flex', 'plus'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Unauthorized');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');

    const { tier, paymentIntentId } = await req.json();
    if (!VALID_TIERS.includes(tier)) throw new Error('Invalid tier');

    // Paid tiers: verify PaymentIntent server-side before updating
    if (tier !== 'essential') {
      if (!paymentIntentId) throw new Error('paymentIntentId required for paid tiers');

      const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (pi.status !== 'succeeded') throw new Error('Payment not completed');
      if (pi.metadata.userId !== user.id) throw new Error('Forbidden');
      if (pi.metadata.tier !== tier) throw new Error('Tier mismatch');
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ subscription_tier: tier })
      .eq('id', user.id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ success: true, tier }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
