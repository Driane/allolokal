const RESEND_API_URL = 'https://api.resend.com/emails';

export interface EmailPayload {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  attachments?: { filename: string; content: string }[];
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) {
    console.error('[resend] RESEND_API_KEY not set');
    return false;
  }

  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[resend] error', res.status, err);
    return false;
  }

  return true;
}
