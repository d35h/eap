import { makeAdmin } from './_lib/supabaseAdmin.js';
import { sendEmail, tourResultEmail } from './_lib/email.js';
import { json } from './_lib/json.js';

// Email each participant of a tour their OWN result: a congratulations/decline
// line + a link to their cabinet (detailed feedback/scores live there).
// Admin-authorized.
export async function handleSendResults({ admin, env }, { token, tour, force }) {
  if (!token) return json(401, { error: 'unauthorized' });
  const { data: caller, error: authErr } = await admin.auth.getUser(token);
  if (authErr || caller?.user?.app_metadata?.role !== 'admin') {
    return json(403, { error: 'forbidden' });
  }
  const t = Number(tour) || 1;
  const sentField = t === 1 ? 'tour1_results_sent' : 'tour2_results_sent';

  const { data: cyc } = await admin.from('cycle_state').select('*').eq('id', 1).maybeSingle();
  if (cyc?.[sentField] && !force) return json(200, { status: 'already_sent' });

  const { data: apps } = await admin
    .from('applications').select('*')
    .eq('payment_status', 'paid')
    .eq('edition', cyc?.current_edition || 1);
  // Tour 1: everyone participated. Tour 2: those who advanced (tour >= 2).
  const participants = (apps || []).filter((a) => (t === 1 ? true : (a.tour || 1) >= 2));

  const loginUrl = `${env.PUBLIC_SITE_URL || ''}/login`;

  let count = 0;
  for (const a of participants) {
    if (!a.email) continue;
    const advanced = t === 1 ? (a.tour || 1) >= 2 : a.standing === 'winner';
    const { subject, html } = tourResultEmail({ lang: a.lang || 'ru', tour: t, advanced, loginUrl });
    try {
      const ok = await sendEmail(env, { to: a.email, subject, html });
      if (ok) count++;
    } catch (e) {
      console.error('result email failed:', a.email, e?.message || e);
    }
  }

  await admin.from('cycle_state').update({ [sentField]: true }).eq('id', 1);
  return json(200, { status: 'sent', count });
}

export async function handler(event) {
  const env = process.env;
  const admin = makeAdmin(env);
  const auth = event.headers?.authorization || event.headers?.Authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '') || null;
  const body = JSON.parse(event.body || '{}');
  return handleSendResults({ admin, env }, { token, tour: body.tour, force: body.force });
}
