import { makeAdmin } from './_lib/supabaseAdmin.js';
import { sendEmail, juryInviteEmail } from './_lib/email.js';
import { json } from './_lib/json.js';
import { envForRequest } from './_lib/siteUrl.js';

// Admin juror management:
//   action 'activate' : resend a set-password (recovery) link to a juror.
//   action 'delete'   : delete the juror's auth account (reviews are kept).
export async function handleManageJuror({ admin, env }, { token, action, jurorId, email }) {
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
    const site = env.PUBLIC_SITE_URL || '';
    const gen = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: lower,
      options: { redirectTo: `${site}/set-password` },
    });
    if (gen.error) return json(200, { status: 'error' });
    const link = gen.data?.properties?.action_link;
    if (link && env.RESEND_API_KEY) {
      const { subject, html } = juryInviteEmail(link);
      try { await sendEmail(env, { to: lower, subject, html }); }
      catch (e) { console.error('activate email failed:', e?.message || e); }
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
  return handleManageJuror({ admin, env }, { token, action: body.action, jurorId: body.jurorId, email: body.email });
}
