// Envoie une push notification via Firebase Cloud Messaging (FCM Legacy HTTP API)
// Variables requises : FCM_SERVER_KEY (depuis Firebase Console → Project Settings → Cloud Messaging)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const FCM_URL = 'https://fcm.googleapis.com/fcm/send';

interface PushPayload {
  user_id:  string;          // destinataire
  title:    string;
  body:     string;
  data?:    Record<string, string>; // données supplémentaires (url, type...)
  icon?:    string;
}

async function sendToToken(token: string, payload: PushPayload): Promise<boolean> {
  const serverKey = Deno.env.get('FCM_SERVER_KEY');
  if (!serverKey) { console.warn('[send-push] FCM_SERVER_KEY not set'); return false; }

  const res = await fetch(FCM_URL, {
    method: 'POST',
    headers: {
      'Authorization':  `key=${serverKey}`,
      'Content-Type':   'application/json',
    },
    body: JSON.stringify({
      to: token,
      priority: 'high',
      notification: {
        title:   payload.title,
        body:    payload.body,
        icon:    payload.icon ?? 'ic_launcher',
        color:   '#2563EB',
        sound:   'default',
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
      data: payload.data ?? {},
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[send-push] FCM error:', res.status, err);
    return false;
  }

  const json = await res.json();

  // Token invalide / expiré → supprimer de la DB
  if (json.results?.[0]?.error === 'NotRegistered' || json.results?.[0]?.error === 'InvalidRegistration') {
    return false; // Le token sera nettoyé par l'appelant si nécessaire
  }

  return true;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });

  try {
    const payload: PushPayload = await req.json();
    if (!payload.user_id || !payload.title) {
      return new Response('missing user_id or title', { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Récupérer tous les tokens de l'utilisateur
    const { data: tokens, error } = await supabase
      .from('push_tokens')
      .select('id, token')
      .eq('user_id', payload.user_id);

    if (error || !tokens?.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: 'no tokens' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Envoyer à tous les appareils en parallèle
    const results = await Promise.all(
      tokens.map(async ({ id, token }) => {
        const ok = await sendToToken(token, payload);
        if (!ok) {
          // Nettoyer le token invalide
          await supabase.from('push_tokens').delete().eq('id', id);
        }
        return ok;
      })
    );

    const sent = results.filter(Boolean).length;
    return new Response(JSON.stringify({ ok: true, sent, total: tokens.length }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[send-push]', err);
    return new Response(String(err), { status: 500 });
  }
});
