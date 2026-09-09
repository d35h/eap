import { makeAdmin } from './_lib/supabaseAdmin.js';
import { sendEmail, juryInviteEmail } from './_lib/email.js';
import { json } from './_lib/json.js';
import { envForRequest } from './_lib/siteUrl.js';
import { rewrittenRedirect } from './_lib/authLink.js';

// Admin juror management:
//   action 'activate' : resend a set-password (recovery) link to a juror.
//   action 'delete'   : delete the juror's auth account (reviews are kept).
export async function handleManageJuror({ admin, env, send }, { token, action, jurorId, email }) {
  if (!token) return json(401, { error: 'unauthorized' });
  const { data: caller, error: authErr } = await admin.auth.getUser(token);
  if (authErr || caller?.user?.app_metadata?.role !== 'admin') {
    return json(403, { error: 'forbidden' });
  }

  if (action === 'delete') {
    if (!jurorId) return json(400, { error: 'jurorId required' });
    const { error } = await admin.auth.admin.deleteUser(jurorId);
    if (error) return json(500, { error: 'delete failed' });
    return json(200, { ok: true });
  }

  if (action === 'activate') {
    const lower = (email || '').trim().toLowerCase();
    if (!lower) return json(400, { error: 'email required' });
    // Same rule as inviting: never report a letter we did not manage to send.
    if (!env.RESEND_API_KEY) {
      return json(503, { error: 'mail transport not configured', code: 'no_transport', status: 'undelivered' });
    }
    const site = env.PUBLIC_SITE_URL || '';
    const redirectTo = `${site}/set-password`;
    const gen = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: lower,
      options: { redirectTo },
    });
    if (gen.error) {
      console.error('manage-juror: could not generate a recovery link:', gen.error?.message || gen.error);
      return json(502, { error: 'could not generate a login link', status: 'error' });
    }
    const link = gen.data?.properties?.action_link;
    if (!link) return json(502, { error: 'could not generate a login link', status: 'error' });
    const elsewhere = rewrittenRedirect(link, redirectTo);
    if (elsewhere) {
      console.error(
        `manage-juror: Supabase overrode the redirect (asked ${redirectTo}, got ${elsewhere}). ` +
        'Add the site to Authentication → URL Configuration → Redirect URLs.'
      );
    }
    const { subject, html } = juryInviteEmail(link);
    try {
      await sendEmail(env, { to: lower, subject, html }, send);
    } catch (e) {
      console.error('manage-juror: provider rejected the send:', e?.message || e);
      return json(502, {
        error: 'the letter could not be delivered',
        status: 'undelivered',
        provider: e?.status ?? null,
        code: e?.code ?? null,
      });
    }
    return json(200, { ok: true });
  }

  return json(400, { error: 'bad action' });
}

export async function handler(event) {
  // The links this makes must point at the host we are actually served from.
  const env = envForRequest(event, process.env);
  const admin = makeAdmin(env);
  const auth = event.headers?.authorization || event.headers?.Authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '') || null;
  const body = JSON.parse(event.body || '{}');
  return handleManageJuror({ admin, env, send: fetch }, { token, action: body.action, jurorId: body.jurorId, email: body.email });
}
