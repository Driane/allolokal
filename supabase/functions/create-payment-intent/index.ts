// deno-lint-ignore-file no-import-prefix
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { amount, currency, proId, clientId } = await req.json()

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Récupérer le Stripe Account ID du Pro
    const { data: proProfile, error: proError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_connect_id')
      .eq('id', proId)
      .single()

    if (proError || !proProfile?.stripe_connect_id) {
      throw new Error("Le professionnel n'est pas configuré pour recevoir des paiements.")
    }

    // 2. Calcul de la commission (9% ou 14%)
    const { count } = await supabaseAdmin
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('pro_id', proId)
      .eq('client_id', clientId)
      .eq('status', 'completed')

    const isRepeated = count !== null && count > 0
    const baseRate = isRepeated ? 0.09 : 0.14
    
    const amountInCentimes = Math.round(amount)
    const platformCommission = amountInCentimes * baseRate
    const taxOnCommission = platformCommission * 0.25 
    const totalApplicationFee = Math.round(platformCommission + taxOnCommission)

    // 3. Créer le Payment Intent sur Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCentimes,
      currency,
      transfer_data: {
        destination: proProfile.stripe_connect_id,
      },
      application_fee_amount: totalApplicationFee,
      metadata: {
        clientId,
        proId,
        isRepeated: String(isRepeated)
      }
    })

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        details: {
          rate: (baseRate * 100).toFixed(0) + "%",
          isRepeated,
          totalFee: totalApplicationFee / 100
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    const err = error as Error;
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})