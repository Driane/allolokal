import { type Lang, getLang, tr } from './i18n.ts';

const APP_URL = Deno.env.get('APP_URL') ?? 'https://allolokal.com';
const FROM    = Deno.env.get('FROM_EMAIL') ?? 'AlloLokal <noreply@allolokal.com>';

// ── Shared layout ─────────────────────────────────────────────────────────────
function layout(content: string, preheader = ''): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>AlloLokal</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>` : ''}
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
      <!-- Header -->
      <tr>
        <td style="background:#111;padding:28px 40px;text-align:center;">
          <span style="font-size:24px;font-weight:900;color:#fff;letter-spacing:-0.5px;">
            Allo<span style="color:#E05530;">Lokal</span>
          </span>
        </td>
      </tr>
      <!-- Body -->
      <tr><td style="padding:40px;">${content}</td></tr>
      <!-- Footer -->
      <tr>
        <td style="background:#f9f9f9;padding:20px 40px;text-align:center;border-top:1px solid #eee;">
          <p style="margin:0;font-size:11px;color:#999;">
            © ${new Date().getFullYear()} AlloLokal — Tous droits réservés<br/>
            <a href="${APP_URL}" style="color:#E05530;text-decoration:none;">allolokal.com</a>
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function btn(label: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;margin-top:24px;padding:14px 32px;background:#E05530;color:#fff;font-size:13px;font-weight:900;text-decoration:none;border-radius:12px;letter-spacing:.05em;text-transform:uppercase;">${label}</a>`;
}

function h1(text: string): string {
  return `<h1 style="margin:0 0 12px;font-size:22px;font-weight:900;color:#111;">${text}</h1>`;
}

function p(text: string): string {
  return `<p style="margin:0 0 12px;font-size:15px;color:#444;line-height:1.6;">${text}</p>`;
}

function separator(): string {
  return `<div style="margin:32px 0;border-top:2px dashed #eee;position:relative;">
    <span style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:#fff;padding:0 12px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.15em;color:#ccc;">English</span>
  </div>`;
}

function bilingual(primaryContent: string, englishContent: string, lang: Lang): string {
  if (lang === 'en') return primaryContent;
  return primaryContent + separator() + englishContent;
}

function row(label: string, value: string, highlight = false): string {
  return `<tr>
    <td style="padding:10px 16px;font-size:13px;color:#666;background:#f9f9f9;border-bottom:1px solid #eee;font-weight:600;">${label}</td>
    <td style="padding:10px 16px;font-size:13px;color:${highlight ? '#E05530' : '#111'};background:#fff;border-bottom:1px solid #eee;font-weight:${highlight ? '900' : '400'};">${value}</td>
  </tr>`;
}

// ── 1. Welcome ────────────────────────────────────────────────────────────────
function welcomeContent(l: Lang, name: string): string {
  const i = tr[l].welcome;
  return `${h1(i.h1(name))}${p(i.p1)}${p(i.p2)}${btn(i.btn, `${APP_URL}/findpro`)}`;
}

export function welcomeTemplate(name: string, rawLang?: string | null): { subject: string; html: string } {
  const l = getLang(rawLang);
  const html = layout(bilingual(welcomeContent(l, name), welcomeContent('en', name), l), tr[l].welcome.preheader(name));
  return { subject: tr[l].welcome.subject, html };
}

// ── 2. Booking received — client ──────────────────────────────────────────────
type BookingClientParams = {
  clientName: string; proName: string; serviceName: string;
  date: string; time: string; price: string; bookingId: string;
};

function bookingClientContent(l: Lang, p2: BookingClientParams): string {
  const i = tr[l].bookingClient;
  const c = tr[l].common;
  return `
    ${h1(i.h1)}
    ${p(i.p1(p2.clientName))}
    ${p(i.p2(p2.proName))}
    <table style="width:100%;border-collapse:collapse;margin:20px 0;border-radius:12px;overflow:hidden;">
      ${row(c.service, p2.serviceName)}
      ${row(c.pro, p2.proName)}
      ${row(c.date, p2.date)}
      ${row(c.time, p2.time)}
      ${row(c.amount, p2.price)}
    </table>
    ${btn(i.btn, `${APP_URL}/dashboard`)}
  `;
}

export function bookingClientTemplate(params: BookingClientParams & { lang?: string | null }): { subject: string; html: string } {
  const l = getLang(params.lang);
  const i = tr[l].bookingClient;
  const html = layout(bilingual(bookingClientContent(l, params), bookingClientContent('en', params), l), i.preheader(params.serviceName, params.date, params.time));
  return { subject: i.subject(params.serviceName), html };
}

// ── 3. Booking confirmed — client ─────────────────────────────────────────────
type BookingConfirmedParams = {
  clientName: string; proName: string; serviceName: string;
  date: string; time: string; price: string;
};

function bookingConfirmedContent(l: Lang, p2: BookingConfirmedParams): string {
  const i = tr[l].bookingConfirmed;
  const c = tr[l].common;
  return `
    ${h1(i.h1)}
    ${p(i.p1(p2.clientName))}
    ${p(i.p2(p2.proName, p2.serviceName))}
    <table style="width:100%;border-collapse:collapse;margin:20px 0;border-radius:12px;overflow:hidden;">
      ${row(c.service, p2.serviceName)}
      ${row(c.pro, p2.proName)}
      ${row(c.date, p2.date)}
      ${row(c.time, p2.time)}
      ${row(c.amount, p2.price, true)}
    </table>
    ${p(i.p3)}
    ${btn(i.btn, `${APP_URL}/dashboard`)}
  `;
}

export function bookingConfirmedClientTemplate(params: BookingConfirmedParams & { lang?: string | null }): { subject: string; html: string } {
  const l = getLang(params.lang);
  const i = tr[l].bookingConfirmed;
  const html = layout(bilingual(bookingConfirmedContent(l, params), bookingConfirmedContent('en', params), l), i.preheader(params.proName, params.serviceName, params.date));
  return { subject: i.subject(params.serviceName), html };
}

// ── 4. Booking cancelled — client ─────────────────────────────────────────────
type BookingCancelledParams = {
  clientName: string; proName: string; serviceName: string;
  date: string; time: string;
};

function bookingCancelledContent(l: Lang, p2: BookingCancelledParams): string {
  const i = tr[l].bookingCancelled;
  const c = tr[l].common;
  return `
    ${h1(i.h1)}
    ${p(i.p1(p2.clientName, p2.proName))}
    <table style="width:100%;border-collapse:collapse;margin:20px 0;border-radius:12px;overflow:hidden;">
      ${row(c.service, p2.serviceName)}
      ${row(c.pro, p2.proName)}
      ${row(c.date, p2.date)}
      ${row(c.time, p2.time)}
    </table>
    ${p(i.p2)}
    ${p(i.p3)}
    ${btn(i.btn, `${APP_URL}/findpro`)}
  `;
}

export function bookingCancelledClientTemplate(params: BookingCancelledParams & { lang?: string | null }): { subject: string; html: string } {
  const l = getLang(params.lang);
  const i = tr[l].bookingCancelled;
  const html = layout(bilingual(bookingCancelledContent(l, params), bookingCancelledContent('en', params), l), i.preheader(params.serviceName, params.date));
  return { subject: i.subject(params.serviceName), html };
}

// ── 5. New booking — pro ──────────────────────────────────────────────────────
type BookingProParams = {
  proName: string; clientName: string; serviceName: string;
  date: string; time: string; price: string; notes?: string | null;
};

function bookingProContent(l: Lang, p2: BookingProParams): string {
  const i = tr[l].bookingPro;
  const c = tr[l].common;
  return `
    ${h1(i.h1)}
    ${p(i.p1(p2.proName))}
    <table style="width:100%;border-collapse:collapse;margin:20px 0;border-radius:12px;overflow:hidden;">
      ${row(c.client, p2.clientName)}
      ${row(c.service, p2.serviceName)}
      ${row(c.date, p2.date)}
      ${row(c.time, p2.time)}
      ${row(c.amount, p2.price)}
      ${p2.notes ? row(c.notes, p2.notes) : ''}
    </table>
    ${btn(i.btn, `${APP_URL}/dashboard`)}
  `;
}

export function bookingProTemplate(params: BookingProParams & { lang?: string | null }): { subject: string; html: string } {
  const l = getLang(params.lang);
  const i = tr[l].bookingPro;
  const html = layout(bilingual(bookingProContent(l, params), bookingProContent('en', params), l), i.preheader(params.clientName, params.date));
  return { subject: i.subject(params.serviceName), html };
}

// ── 6. Review request ─────────────────────────────────────────────────────────
type ReviewRequestParams = {
  clientName: string; proName: string; serviceName: string; proId: string;
};

function reviewRequestContent(l: Lang, p2: ReviewRequestParams): string {
  const i = tr[l].reviewRequest;
  return `
    ${h1(i.h1)}
    ${p(i.p1(p2.clientName, p2.serviceName, p2.proName))}
    ${p(i.p2)}
    ${btn(i.btn, `${APP_URL}/profile/${p2.proId}`)}
  `;
}

export function reviewRequestTemplate(params: ReviewRequestParams & { lang?: string | null }): { subject: string; html: string } {
  const l = getLang(params.lang);
  const i = tr[l].reviewRequest;
  const html = layout(bilingual(reviewRequestContent(l, params), reviewRequestContent('en', params), l), i.preheader(params.proName));
  return { subject: i.subject(params.proName), html };
}

// ── 7. Monthly recap ──────────────────────────────────────────────────────────
type MonthlyRecapParams = {
  proName: string; month: string; totalBookings: number; totalRevenue: string;
  bookings: { date: string; client: string; service: string; amount: string }[];
};

function monthlyRecapContent(l: Lang, p2: MonthlyRecapParams): string {
  const i = tr[l].monthlyRecap;
  const h = i.headers;
  const rows = p2.bookings.map(b =>
    `<tr style="border-bottom:1px solid #f0f0f0;">
      <td style="padding:10px 8px;font-size:13px;color:#444;">${b.date}</td>
      <td style="padding:10px 8px;font-size:13px;color:#444;">${b.client}</td>
      <td style="padding:10px 8px;font-size:13px;color:#444;">${b.service}</td>
      <td style="padding:10px 8px;font-size:13px;color:#111;font-weight:700;text-align:right;">${b.amount}</td>
    </tr>`
  ).join('');
  return `
    ${h1(i.h1(p2.month))}
    ${p(i.p1(p2.proName, p2.month))}
    <table style="width:100%;border-collapse:collapse;margin:20px 0;border-radius:12px;overflow:hidden;">
      ${row(i.bookingsLabel, String(p2.totalBookings))}
      ${row(i.revenueLabel, p2.totalRevenue, true)}
    </table>
    <h2 style="font-size:14px;font-weight:900;color:#111;text-transform:uppercase;letter-spacing:.08em;margin:24px 0 12px;">${i.detailTitle}</h2>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#f9f9f9;">
          <th style="padding:8px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#999;text-align:left;">${h.date}</th>
          <th style="padding:8px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#999;text-align:left;">${h.client}</th>
          <th style="padding:8px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#999;text-align:left;">${h.service}</th>
          <th style="padding:8px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#999;text-align:right;">${h.amount}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    ${p('<br/>' + i.invoiceNote)}
    ${btn(i.btn, `${APP_URL}/dashboard`)}
  `;
}

export function monthlyRecapTemplate(params: MonthlyRecapParams & { lang?: string | null }): { subject: string; html: string } {
  const l = getLang(params.lang);
  const i = tr[l].monthlyRecap;
  const html = layout(bilingual(monthlyRecapContent(l, params), monthlyRecapContent('en', params), l), i.preheader(params.month, params.totalBookings, params.totalRevenue));
  return { subject: i.subject(params.month), html };
}

// ── 8. Dispute resolved ───────────────────────────────────────────────────────
type DisputeParams = {
  recipientName: string; verdict: 'client_won' | 'pro_won' | 'closed';
  serviceName: string; adminNote: string; isClient: boolean;
};

function disputeContent(l: Lang, p2: DisputeParams): string {
  const i = tr[l].dispute;
  const verdictLabel = i.verdicts[p2.verdict];
  const verdictColor = p2.verdict === 'client_won' ? '#3b82f6' : p2.verdict === 'pro_won' ? '#22c55e' : '#6b7280';
  const consequence  = p2.isClient ? i.consequences.client[p2.verdict] : i.consequences.pro[p2.verdict];
  return `
    ${h1(i.h1)}
    ${p(i.p1(p2.recipientName))}
    ${p(i.p2(p2.serviceName))}
    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      ${row(i.decisionLabel, `<span style="font-weight:900;color:${verdictColor};">${verdictLabel}</span>`)}
    </table>
    <div style="background:#f9f9f9;border-radius:12px;padding:20px;margin:20px 0;border-left:4px solid ${verdictColor};">
      <p style="margin:0;font-size:13px;color:#444;font-style:italic;">"${p2.adminNote}"</p>
    </div>
    ${p(consequence)}
    ${p(i.p3)}
    ${btn(i.btn, `${APP_URL}/dashboard`)}
  `;
}

export function disputeResolvedTemplate(params: DisputeParams & { lang?: string | null }): { subject: string; html: string } {
  const l = getLang(params.lang);
  const i = tr[l].dispute;
  const verdictLabel = i.verdicts[params.verdict];
  const html = layout(bilingual(disputeContent(l, params), disputeContent('en', params), l), `${i.h1} — ${verdictLabel}`);
  return { subject: i.subject(params.serviceName), html };
}

// ── Invoice PDF ───────────────────────────────────────────────────────────────
export function generateInvoiceHtml(params: {
  proName: string; storeName?: string | null; month: string;
  bookings: { date: string; client: string; service: string; amount: string; price_cents: number }[];
  totalRevenue: string; invoiceNumber: string;
}): string {
  const { proName, storeName, month, bookings, totalRevenue, invoiceNumber } = params;

  const rows = bookings.map(b =>
    `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${b.date}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${b.client}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${b.service}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:700;">${b.amount}</td>
    </tr>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"/><title>Facture ${invoiceNumber}</title>
<style>body{font-family:system-ui,sans-serif;font-size:14px;color:#222;margin:0;padding:40px;}h1{font-size:22px;font-weight:900;}table{width:100%;border-collapse:collapse;}th{background:#f5f5f5;padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#666;}</style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px;">
    <div>
      <h1 style="margin:0 0 4px;">Allo<span style="color:#E05530;">Lokal</span></h1>
      <p style="margin:0;font-size:12px;color:#888;">Plateforme de services à domicile</p>
    </div>
    <div style="text-align:right;">
      <p style="margin:0;font-size:18px;font-weight:900;color:#111;">FACTURE</p>
      <p style="margin:4px 0 0;font-size:12px;color:#888;">${invoiceNumber}</p>
    </div>
  </div>
  <div style="margin-bottom:32px;">
    <p style="margin:0;font-weight:700;">${storeName || proName}</p>
    <p style="margin:0;font-size:13px;color:#666;">Récapitulatif — ${month}</p>
  </div>
  <table>
    <thead>
      <tr><th>Date</th><th>Client</th><th>Prestation</th><th style="text-align:right;">Montant</th></tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr style="border-top:2px solid #111;">
        <td colspan="3" style="padding:12px;font-weight:900;font-size:15px;">Total</td>
        <td style="padding:12px;font-weight:900;font-size:15px;text-align:right;">${totalRevenue}</td>
      </tr>
    </tfoot>
  </table>
  <p style="margin-top:40px;font-size:11px;color:#aaa;">Document généré automatiquement le ${new Date().toLocaleDateString('fr-FR')} par AlloLokal.</p>
</body>
</html>`;
}

export { FROM };
export type { Lang };
