import { makeAdmin } from './_lib/supabaseAdmin.js';
import { sendEmail, passwordResetEmail } from './_lib/email.js';
import { json } from './_lib/json.js';

// Public endpoint: generate a recovery link server-side and email it via Resend
// in our branded template — instead of Supabase's default reset email.
// Always returns a neutral { status: 'sent' } so it never reveals whether an
// account exists for the given address.
export async function handleResetRequest({ admin, env }, { email, lang }) {
  const lower = (email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lower)) {
    // Neutral response even for malformed input — no enumeration signal.
    return json(200, { status: 'sent' });
  }

  const site = env.PUBLIC_SITE_URL || '';

  const gen = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: lower,
    options: { redirectTo: `${site}/set-password` },
  });

  // No such user (or any GoTrue error) → swallow and respond neutrally.
  if (gen.error) return json(200, { status: 'sent' });

  const link = gen.data?.properties?.action_link;
  if (link && env.RESEND_API_KEY) {
    const { subject, html } = passwordResetEmail(link, lang);
    try {
      await sendEmail(env, { to: lower, subject, html });
    } catch (e) {
      console.error('password reset email failed:', e?.message || e);
    }
  }

  return json(200, { status: 'sent' });
}

export async function handler(event) {
  const env = process.env;
  const admin = makeAdmin(env);
  const body = JSON.parse(event.body || '{}');
  return handleResetRequest({ admin, env }, { email: body.email, lang: body.lang });
}
