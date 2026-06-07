import { makeAdmin } from './_lib/supabaseAdmin.js';
import { sendEmail, tourResultEmail } from './_lib/email.js';
import { json } from './_lib/json.js';

// Mirror of src/lib/reviewCriteria.js (titles used in the feedback section).
const CRITERIA = [
  { key: 'craft', title: 'Идея важнее техники' },
  { key: 'originality', title: 'Оригинальность' },
];

// Email each participant of a tour their OWN result: a congratulations/decline
// line + the jury's written feedback (no scores). Admin-authorized.
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
    .from('applications').select('*').eq('payment_status', 'paid');
  // Tour 1: everyone participated. Tour 2: those who advanced (tour >= 2).
  const participants = (apps || []).filter((a) => (t === 1 ? true : (a.tour || 1) >= 2));

  const { data: reviews } = await admin
    .from('application_reviews').select('application_id, scores, status').eq('tour', t);
  const byApp = {};
  (reviews || []).filter((r) => r.status === 'finished').forEach((r) => {
    (byApp[r.application_id] ||= []).push(r);
  });

  let count = 0;
  for (const a of participants) {
    if (!a.email) continue;
    const advanced = t === 1 ? (a.tour || 1) >= 2 : a.standing === 'winner';
    const feedback = CRITERIA.map((c) => ({
      title: c.title,
      comments: (byApp[a.id] || [])
        .map((r) => (r.scores?.[c.key]?.text || '').trim())
        .filter(Boolean),
    })).filter((c) => c.comments.length);

    const { subject, html } = tourResultEmail({ lang: a.lang || 'ru', tour: t, advanced, feedback });
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
