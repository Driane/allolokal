import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createBookingFromPayment, SlotTakenError } from '../_shared/bookings.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  // @ts-ignore: Version mismatch between SDK and Stripe API is handled by Stripe
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  try {
    const body = await req.text();
    let event;

    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        endpointSecret!,
        undefined
      );
    } catch (err) {
      // Correction 'unknown' : on vérifie le type avant d'accéder à .message
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error(`❌ Erreur de signature: ${msg}`);
      return new Response(`Webhook Error: ${msg}`, { status: 400 });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    if (event.type === 'account.updated') {
      const account = event.data.object as Stripe.Account;

      if (account.details_submitted && account.charges_enabled) {
        const { error } = await supabaseAdmin
          .from('profiles')
          .update({ onboarding_complete: true })
          .eq('stripe_connect_id', account.id);

        if (error) throw error;
      }
    }

    // Safety net: if client disconnected after payment but before calling update-subscription
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent;
      const { userId, tier } = pi.metadata ?? {};

      if (userId && ['essential', 'flex', 'plus'].includes(tier)) {
        await supabaseAdmin
          .from('profiles')
          .update({ subscription_tier: tier })
          .eq('id', userId);
      }

      // Safety net: client paid but never reached confirm-booking (tab closed, redirect, network)
      if (pi.metadata?.kind === 'booking') {
        try {
          await createBookingFromPayment(
            supabaseAdmin,
            pi,
            (id) => stripe.refunds.create({ payment_intent: id, reverse_transfer: true, refund_application_fee: true }),
          );
        } catch (err) {
          // Slot taken: payment already refunded, nothing for Stripe to retry
          if (!(err instanceof SlotTakenError)) throw err;
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    // Correction 'unknown' ici aussi
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
})