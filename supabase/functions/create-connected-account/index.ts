// supabase/functions/create-connected-account/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno"

// 1. Définition des headers CORS pour autoriser ton app React
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 2. Gestion du "Preflight request" (nécessaire pour les navigateurs)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error("Missing STRIPE_SECRET_KEY environment variable");
    }

    const stripe = new Stripe(stripeSecretKey, {
      httpClient: Stripe.createFetchHttpClient(),
    });

    const { user, appUrl } = await req.json();

    const baseUrl = appUrl
      || Deno.env.get('APP_URL')
      || req.headers.get('origin')
      || 'https://allolokal.com';

    // 3. Création du compte Connect
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'HR',
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    // 4. Génération du lien
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${baseUrl}/onboarding`,
      return_url: `${baseUrl}/dashboard`,
      type: 'account_onboarding',
    });

    // 5. Retour avec les headers CORS
    return new Response(
      JSON.stringify({ url: accountLink.url, accountId: account.id }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400 
      }
    );
  }
})