import { json } from './_lib/json.js';

// Relays a contact message to the platform's inbox.
//
// The form used to fake this: it waited 900ms and reported success without
// sending anything, so every enquiry since launch was lost while the sender
// was told it had arrived. This never reports success it cannot back up - if
// the provider is not configured or the call fails, it says so and the form
// offers the address directly.

const TO = process.env.CONTACT_TO || 'info@eap.art';
const FROM = process.env.CONTACT_FROM || 'Eurasia Art Platform <noreply@eurasiaartplatform.com>';

const clean = (v, max) => String(v ?? '').trim().slice(0, max);
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export async function handleContact({ env, send }, input) {
  const name = clean(input?.name, 120);
  const email = clean(input?.email, 200);
  const subject = clean(input?.subject, 200);
  const message = clean(input?.message, 5000);

  if (!name || !message || !isEmail(email)) {
    return json(400, { error: 'name, a valid email and message are required' });
  }
  if (!env.RESEND_API_KEY) {
    // Better a visible failure than a success the sender cannot rely on.
    return json(503, { error: 'mail transport not configured', code: 'no_transport' });
  }

  const body = [
    `From: ${name} <${email}>`,
    subject ? `Subject: ${subject}` : null,
    '',
    message,
  ].filter((l) => l !== null).join('\n');

  const res = await send('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: [TO],
      reply_to: email,
      subject: subject ? `[EAP] ${subject}` : `[EAP] Сообщение от ${name}`,
      text: body,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error('contact: provider rejected', res.status, detail.slice(0, 300));
    return json(502, { error: 'could not deliver the message' });
  }
  return json(200, { ok: true });
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'method not allowed' });
  let input;
  try {
    input = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'invalid body' });
  }
  return handleContact({ env: process.env, send: fetch }, input);
}
