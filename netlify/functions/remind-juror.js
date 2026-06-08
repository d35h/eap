import { makeAdmin } from './_lib/supabaseAdmin.js';
import { sendEmail, juryReminderEmail } from './_lib/email.js';
import { json } from './_lib/json.js';

// Admin nudges one juror who has skipped applications: computes how many of the
// active-tour applications they have NOT finished, then emails them a reminder
// with a link to the jury cabinet. Authoritative count is computed server-side.
export async function handleRemindJuror({ admin, env }, { token, jurorId, email, tour }) {
  if (!token) return json(401, { error: 'unauthorized' });
  const { data: caller, error } = await admin.auth.getUser(token);
  if (error || caller?.user?.app_metadata?.role !== 'admin') return json(403, { error: 'forbidden' });
  if (!jurorId || !email) return json(400, { error: 'missing juror' });

  const { data: cyc } = await admin.from('cycle_state').select('*').eq('id', 1).maybeSingle();
  const t = Number(tour) || cyc?.active_tour || 1;
  const edition = cyc?.current_edition || 1;

  // Applications under evaluation right now: paid, current edition, still active.
  const { data: apps } = await admin
    .from('applications').select('id')
    .eq('payment_status', 'paid').eq('edition', edition).eq('standing', 'active');
  const ids = (apps || []).map((a) => a.id);

  let finished = new Set();
  if (ids.length) {
    const { data: revs } = await admin
      .from('application_reviews').select('application_id')
      .in('application_id', ids).eq('tour', t).eq('reviewer_id', jurorId).eq('status', 'finished');
    finished = new Set((revs || []).map((r) => r.application_id));
  }
  const pending = ids.filter((id) => !finished.has(id)).length;
  if (pending === 0) return json(200, { status: 'none', pending: 0 });

  const link = `${env.PUBLIC_SITE_URL || ''}/login`;
  const { subject, html } = juryReminderEmail(pending, t, link);
  try {
    const ok = await sendEmail(env, { to: email, subject, html });
    return json(200, { status: ok ? 'sent' : 'no_email', pending });
  } catch (e) {
    return json(500, { error: e?.message || 'send failed' });
  }
}

export async function handler(event) {
  const env = process.env;
  const admin = makeAdmin(env);
  const auth = event.headers?.authorization || event.headers?.Authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '') || null;
  const body = JSON.parse(event.body || '{}');
  return handleRemindJuror({ admin, env }, { token, jurorId: body.jurorId, email: body.email, tour: body.tour });
}
