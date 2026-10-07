import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createBookingFromPayment, SlotTakenError } from '../_shared/bookings.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  // @ts-ignore
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_NOTE_LENGTH = 2000;

// Appelée par BookingPage après un paiement réussi. La réservation n'est créée qu'après
// vérification auprès de Stripe que le paiement a bien abouti et appartient à cet utilisateur.
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) throw new Error('Unauthorized');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');

    const { paymentIntentId, note, imageUrl } = await req.json();
    if (typeof paymentIntentId !== 'string' || !paymentIntentId.startsWith('pi_')) {
      throw new Error('Paiement invalide.');
    }

    // 1. Le paiement est relu chez Stripe : statut et propriétaire ne viennent pas du navigateur
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (pi.metadata?.kind !== 'booking' || pi.metadata?.clientId !== user.id) {
      throw new Error('Paiement invalide.');
    }
    if (pi.status !== 'succeeded') {
      throw new Error("Le paiement n'est pas confirmé.");
    }

    // 2. Pièce jointe : uniquement un fichier déposé par cet utilisateur dans son dossier
    const attachmentPrefix = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/booking-attachments/${user.id}/`;
    const safeImageUrl = typeof imageUrl === 'string' && imageUrl.startsWith(attachmentPrefix) ? imageUrl : null;
    const safeNote = typeof note === 'string' ? note.slice(0, MAX_NOTE_LENGTH) : null;

    const booking = await createBookingFromPayment(
      supabaseAdmin,
      pi,
      (id) => stripe.refunds.create({ payment_intent: id, reverse_transfer: true, refund_application_fee: true }),
      { note: safeNote, imageUrl: safeImageUrl },
    );

    // Le webhook a pu créer la réservation avant nous, sans la note ni la pièce jointe
    if ((safeNote && !booking.notes) || (safeImageUrl && !booking.image_url)) {
      await supabaseAdmin
        .from('bookings')
        .update({ notes: booking.notes ?? safeNote, image_url: booking.image_url ?? safeImageUrl })
        .eq('id', booking.id);
    }

    return new Response(
      JSON.stringify({ bookingId: booking.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    const status = msg === 'Unauthorized' ? 401 : error instanceof SlotTakenError ? 409 : 400;
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status }
    );
  }
});
