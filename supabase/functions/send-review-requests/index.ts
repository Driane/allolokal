// Scheduled: every hour — finds bookings completed ~24h ago with no review email sent
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendEmail } from '../_shared/resend.ts';
import { reviewRequestTemplate, FROM } from '../_shared/templates.ts';

serve(async (_req: Request) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Window: bookings whose date was between 24h and 25h ago
    const now    = new Date();
    const from24 = new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString();
    const to24   = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id, client_id, pro_id, service_id, booking_date')
      .eq('status', 'confirmed')
      .eq('payment_status', 'paid')
      .eq('review_email_sent', false)
      .gte('booking_date', from24)
      .lt('booking_date', to24);

    if (error) throw error;
    if (!bookings || bookings.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: { 'Content-Type': 'application/json' } });
    }

    let sent = 0;

    for (const booking of bookings) {
      const [clientAuthRes, proRes, serviceRes, clientProfileRes] = await Promise.all([
        supabase.auth.admin.getUserById(booking.client_id),
        supabase.from('profiles').select('full_name, store_name').eq('id', booking.pro_id).single(),
        supabase.from('services').select('title').eq('id', booking.service_id).single(),
        supabase.from('profiles').select('full_name').eq('id', booking.client_id).single(),
      ]);

      const clientEmail = clientAuthRes.data?.user?.email;
      if (!clientEmail) continue;

      const clientName  = clientProfileRes.data?.full_name || clientEmail.split('@')[0] || 'Client';
      const proName     = proRes.data?.store_name || proRes.data?.full_name || 'Professionnel';
      const serviceName = serviceRes.data?.title || 'Prestation';

      const { subject, html } = reviewRequestTemplate({
        clientName,
        proName,
        serviceName,
        proId: booking.pro_id,
      });

      const ok = await sendEmail({ from: FROM, to: clientEmail, subject, html });
      if (ok) {
        await supabase
          .from('bookings')
          .update({ review_email_sent: true })
          .eq('id', booking.id);
        sent++;
      }
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[send-review-requests]', err);
    return new Response(String(err), { status: 500 });
  }
});
