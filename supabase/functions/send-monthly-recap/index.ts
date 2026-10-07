// Scheduled: 1st of each month at 06:00 UTC — sends recap + invoice to all pros
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendEmail } from '../_shared/resend.ts';
import { monthlyRecapTemplate, generateInvoiceHtml, FROM } from '../_shared/templates.ts';

serve(async (_req: Request) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Previous month range
    const now        = new Date();
    const firstOfPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const firstOfCurr = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthLabel = firstOfPrev.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

    // All pros
    const { data: pros } = await supabase
      .from('profiles')
      .select('id, full_name, store_name')
      .eq('role', 'pro');

    if (!pros || pros.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: { 'Content-Type': 'application/json' } });
    }

    let sent = 0;

    for (const pro of pros) {
      // Fetch completed paid bookings for this pro last month
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, booking_date, client_id, service_id, total_price')
        .eq('pro_id', pro.id)
        .eq('status', 'confirmed')
        .eq('payment_status', 'paid')
        .gte('booking_date', firstOfPrev.toISOString())
        .lt('booking_date', firstOfCurr.toISOString());

      if (!bookings || bookings.length === 0) continue;

      // Enrich each booking with client + service name
      const enriched = await Promise.all(
        bookings.map(async (b) => {
          const [clientRes, serviceRes] = await Promise.all([
            supabase.from('profiles').select('full_name').eq('id', b.client_id).single(),
            supabase.from('services').select('name').eq('id', b.service_id).single(),
          ]);
          const date   = new Date(b.booking_date).toLocaleDateString('fr-FR');
          const amount = b.total_price ? `${(b.total_price / 100).toFixed(2)} €` : '—';
          return {
            date,
            client:      clientRes.data?.full_name || 'Client',
            service:     serviceRes.data?.name || 'Prestation',
            amount,
            price_cents: b.total_price || 0,
          };
        })
      );

      const totalCents   = enriched.reduce((s, b) => s + b.price_cents, 0);
      const totalRevenue = `${(totalCents / 100).toFixed(2)} €`;

      // Build invoice number: INV-YYYYMM-proId(6)
      const invoiceNumber = `INV-${firstOfPrev.getFullYear()}${String(firstOfPrev.getMonth() + 1).padStart(2, '0')}-${pro.id.slice(0, 6).toUpperCase()}`;

      // Get pro email
      const { data: authData } = await supabase.auth.admin.getUserById(pro.id);
      const proEmail = authData?.user?.email;
      if (!proEmail) continue;

      const proName = pro.store_name || pro.full_name || 'Professionnel';

      // Email body
      const { subject, html } = monthlyRecapTemplate({
        proName,
        month: monthLabel,
        totalBookings: enriched.length,
        totalRevenue,
        bookings: enriched,
      });

      // Invoice as HTML attachment (base64)
      const invoiceHtml   = generateInvoiceHtml({ proName, storeName: pro.store_name, month: monthLabel, bookings: enriched, totalRevenue, invoiceNumber });
      const invoiceBase64 = btoa(unescape(encodeURIComponent(invoiceHtml)));

      const ok = await sendEmail({
        from: FROM,
        to: proEmail,
        subject,
        html,
        attachments: [{
          filename: `facture-${invoiceNumber}.html`,
          content:  invoiceBase64,
        }],
      });

      if (ok) sent++;
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[send-monthly-recap]', err);
    return new Response(String(err), { status: 500 });
  }
});
