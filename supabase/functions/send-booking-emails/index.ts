import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendEmail } from '../_shared/resend.ts';
import { bookingClientTemplate, bookingProTemplate, FROM } from '../_shared/templates.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey' } });
  }
  try {
    const payload = await req.json();
    const booking = payload.record;
    if (!booking) return new Response('no record', { status: 400 });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Fetch related data
    // Ne pas envoyer d'email pour les réservations récurrentes futures (déjà schedulées)
    if (booking.payment_status === 'scheduled') {
      return new Response(JSON.stringify({ ok: true, skipped: 'scheduled' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const [clientRes, proRes, serviceRes, clientProfile] = await Promise.all([
      supabase.auth.admin.getUserById(booking.client_id),
      supabase.from('profiles').select('full_name, store_name').eq('id', booking.pro_id).single(),
      supabase.from('services').select('title').eq('id', booking.service_id).single(),
      supabase.from('profiles').select('full_name').eq('id', booking.client_id).single(),
    ]);

    const clientEmail = clientRes.data?.user?.email;
    const proEmail    = (await supabase.auth.admin.getUserById(booking.pro_id)).data?.user?.email;

    const clientName  = clientProfile.data?.full_name || clientEmail?.split('@')[0] || 'Client';
    const proName     = proRes.data?.store_name || proRes.data?.full_name || 'Professionnel';
    const serviceName = serviceRes.data?.title || 'Prestation';

    const dateObj = new Date(booking.booking_date);
    const date    = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const time    = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    // total_price est stocké en euros (pas en centimes)
    const price = booking.total_price != null
      ? `${Number(booking.total_price).toFixed(2)} €`
      : 'À définir';

    const emails: Promise<boolean>[] = [];

    if (clientEmail) {
      const { subject, html } = bookingClientTemplate({
        clientName,
        proName,
        serviceName,
        date,
        time,
        price,
        bookingId: booking.id,
      });
      emails.push(sendEmail({ from: FROM, to: clientEmail, subject, html }));
    }

    if (proEmail) {
      const { subject, html } = bookingProTemplate({
        proName,
        clientName,
        serviceName,
        date,
        time,
        price,
        notes: booking.notes,
      });
      emails.push(sendEmail({ from: FROM, to: proEmail, subject, html }));
    }

    await Promise.all(emails);

    // Push notifications (non bloquant)
    const pushBase = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push`;
    const pushKey  = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const pushOpts = { method: 'POST', headers: { 'Authorization': `Bearer ${pushKey}`, 'Content-Type': 'application/json' } };
    await Promise.allSettled([
      fetch(pushBase, { ...pushOpts, body: JSON.stringify({
        user_id: booking.client_id,
        title:   '📅 Demande envoyée',
        body:    `Votre réservation pour ${serviceName} le ${date} à ${time} est en attente de confirmation.`,
        data:    { url: '/dashboard' },
      }) }),
      fetch(pushBase, { ...pushOpts, body: JSON.stringify({
        user_id: booking.pro_id,
        title:   '🔔 Nouvelle réservation',
        body:    `${clientName} a réservé ${serviceName} le ${date} à ${time}.`,
        data:    { url: '/dashboard' },
      }) }),
    ]);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[send-booking-emails]', err);
    return new Response(String(err), { status: 500 });
  }
});
