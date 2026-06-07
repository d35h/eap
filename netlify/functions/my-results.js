import { makeAdmin } from './_lib/supabaseAdmin.js';
import { json } from './_lib/json.js';

const CRITERIA = [
  { key: 'craft', title: 'Идея важнее техники' },
  { key: 'originality', title: 'Оригинальность' },
];

// Return the caller's own published tour results. Tour 1: jury feedback only
// (no scores). Tour 2: feedback + per-criterion average score. Only tours whose
// results the admin has sent/published are included.
export async function handleMyResults({ admin }, { token }) {
  if (!token) return json(401, { error: 'unauthorized' });
  const { data: caller, error } = await admin.auth.getUser(token);
  if (error || !caller?.user) return json(401, { error: 'unauthorized' });
  const uid = caller.user.id;

  const { data: cyc } = await admin.from('cycle_state').select('*').eq('id', 1).maybeSingle();
  const { data: apps } = await admin
    .from('applications').select('*').eq('user_id', uid).eq('payment_status', 'paid');

  const out = [];
  for (const app of apps || []) {
    const tours = [];
    for (const t of [1, 2]) {
      const sent = t === 1 ? cyc?.tour1_results_sent : cyc?.tour2_results_sent;
      if (!sent) continue;
      if (t === 2 && (app.tour || 1) < 2) continue; // never reached tour 2

      const { data: revs } = await admin
        .from('application_reviews').select('scores, status')
        .eq('application_id', app.id).eq('tour', t);
      const finished = (revs || []).filter((r) => r.status === 'finished');
      const withScores = t === 2;

      const feedback = CRITERIA.map((c) => {
        const comments = finished
          .map((r) => (r.scores?.[c.key]?.text || '').trim())
          .filter(Boolean);
        let avg = null;
        if (withScores) {
          const ratings = finished
            .map((r) => Number(r.scores?.[c.key]?.rating))
            .filter((n) => Number.isFinite(n));
          if (ratings.length) avg = Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10;
        }
        return { title: c.title, comments, avg };
      }).filter((c) => c.comments.length || c.avg != null);

      const outcome = t === 1
        ? ((app.tour || 1) >= 2 ? 'advanced' : 'eliminated')
        : (app.standing === 'winner' ? 'winner' : 'eliminated');

      tours.push({ tour: t, outcome, feedback });
    }
    if (tours.length) out.push({ application_id: app.id, tours });
  }
  return json(200, { results: out });
}

export async function handler(event) {
  const env = process.env;
  const admin = makeAdmin(env);
  const auth = event.headers?.authorization || event.headers?.Authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '') || null;
  return handleMyResults({ admin }, { token });
}
