// Triggered by DB Webhook on bookings UPDATE
// Sends an email to the client when the pro confirms or cancels a booking
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendEmail } from '../_shared/resend.ts';
import {
  bookingConfirmedClientTemplate,
  bookingCancelledClientTemplate,
  FROM,
} from '../_shared/templates.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey' } });
  }
  try {
    const payload = await req.json();
    const booking     = payload.record;
    const oldBooking  = payload.old_record;

    if (!booking || !oldBooking) {
      return new Response('missing record', { status: 400 });
    }

    // Ne déclencher que si le statut a réellement changé
    if (booking.status === oldBooking.status) {
      return new Response(JSON.stringify({ ok: true, skipped: 'no status change' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // On ne gère que confirmed et cancelled
    if (!['confirmed', 'cancelled'].includes(booking.status)) {
      return new Response(JSON.stringify({ ok: true, skipped: 'irrelevant status' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const [clientRes, proRes, serviceRes] = await Promise.all([
      supabase.auth.admin.getUserById(booking.client_id),
      supabase.from('profiles').select('full_name, store_name').eq('id', booking.pro_id).single(),
      supabase.from('services').select('title').eq('id', booking.service_id).single(),
    ]);

    const clientEmail = clientRes.data?.user?.email;
    if (!clientEmail) {
      console.warn('[send-status-emails] no client email for booking', booking.id);
      return new Response(JSON.stringify({ ok: true, skipped: 'no email' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const clientProfile = await supabase.from('profiles').select('full_name').eq('id', booking.client_id).single();

    const clientName  = clientProfile.data?.full_name || clientEmail.split('@')[0] || 'Client';
    const proName     = proRes.data?.store_name || proRes.data?.full_name || 'Professionnel';
    const serviceName = serviceRes.data?.title || 'Prestation';

    const dateObj = new Date(booking.booking_date);
    const date    = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const time    = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const price   = booking.total_price != null ? `${Number(booking.total_price).toFixed(2)} €` : 'À définir';

    let emailResult: { subject: string; html: string };

    if (booking.status === 'confirmed') {
      emailResult = bookingConfirmedClientTemplate({ clientName, proName, serviceName, date, time, price });
    } else {
      emailResult = bookingCancelledClientTemplate({ clientName, proName, serviceName, date, time });
    }

    await sendEmail({ from: FROM, to: clientEmail, ...emailResult });

    // Push notification au client
    const isConfirmed = booking.status === 'confirmed';
    const pushBase = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push`;
    const pushKey  = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    await fetch(pushBase, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${pushKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: booking.client_id,
        title:   isConfirmed ? '✅ Réservation confirmée !' : '❌ Réservation annulée',
        body:    isConfirmed
          ? `${proName} a confirmé votre ${serviceName} le ${date} à ${time}.`
          : `${proName} a annulé votre ${serviceName}. Vous serez remboursé(e).`,
        data: { url: '/dashboard' },
      }),
    }).catch(() => {});

    return new Response(JSON.stringify({ ok: true, status: booking.status }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[send-status-emails]', err);
    return new Response(String(err), { status: 500 });
  }
});
