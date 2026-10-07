// Envoyé quand un admin résout un litige
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendEmail } from '../_shared/resend.ts';
import { disputeResolvedTemplate, FROM } from '../_shared/templates.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey' } });
  }
  try {
    const { booking_id, verdict, admin_note } = await req.json();
    if (!booking_id || !verdict) return new Response('missing params', { status: 400 });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Récupérer les données de la réservation
    const { data: booking } = await supabase
      .from('bookings')
      .select('client_id, pro_id, service_id')
      .eq('id', booking_id)
      .single();

    if (!booking) return new Response('booking not found', { status: 404 });

    const [clientRes, proRes, serviceRes, clientProfile, proProfile] = await Promise.all([
      supabase.auth.admin.getUserById(booking.client_id),
      supabase.auth.admin.getUserById(booking.pro_id),
      supabase.from('services').select('title').eq('id', booking.service_id).single(),
      supabase.from('profiles').select('full_name').eq('id', booking.client_id).single(),
      supabase.from('profiles').select('full_name, store_name').eq('id', booking.pro_id).single(),
    ]);

    const clientEmail   = clientRes.data?.user?.email;
    const proEmail      = proRes.data?.user?.email;
    const serviceName   = serviceRes.data?.title ?? 'Prestation';
    const clientName    = clientProfile.data?.full_name ?? 'Client';
    const proName       = proProfile.data?.store_name ?? proProfile.data?.full_name ?? 'Prestataire';
    const ver = verdict as 'client_won' | 'pro_won' | 'closed';

    const emails: Promise<boolean>[] = [];

    if (clientEmail) {
      const { subject, html } = disputeResolvedTemplate({ recipientName: clientName, verdict: ver, serviceName, adminNote: admin_note, isClient: true });
      emails.push(sendEmail({ from: FROM, to: clientEmail, subject, html }));
    }
    if (proEmail) {
      const { subject, html } = disputeResolvedTemplate({ recipientName: proName, verdict: ver, serviceName, adminNote: admin_note, isClient: false });
      emails.push(sendEmail({ from: FROM, to: proEmail, subject, html }));
    }

    await Promise.all(emails);

    // Push aux deux parties
    const pushBase = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push`;
    const pushKey  = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const verdictLabel = ver === 'client_won' ? 'en votre faveur' : ver === 'pro_won' ? 'en faveur du prestataire' : 'clôturé';
    await Promise.allSettled([
      fetch(pushBase, { method: 'POST', headers: { 'Authorization': `Bearer ${pushKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: booking.client_id, title: '⚖️ Décision rendue', body: `Litige ${verdictLabel}. Consultez vos emails pour le détail.`, data: { url: '/dashboard' } }) }),
      fetch(pushBase, { method: 'POST', headers: { 'Authorization': `Bearer ${pushKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: booking.pro_id, title: '⚖️ Décision rendue', body: `Litige ${verdictLabel}. Consultez vos emails pour le détail.`, data: { url: '/dashboard' } }) }),
    ]);

    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('[send-dispute-emails]', err);
    return new Response(String(err), { status: 500 });
  }
});
