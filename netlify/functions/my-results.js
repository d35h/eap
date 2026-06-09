import { makeAdmin } from './_lib/supabaseAdmin.js';
import { json } from './_lib/json.js';

const CRITERIA = [
  { key: 'craft', title: 'Идея важнее техники' },
  { key: 'originality', title: 'Оригинальность' },
];

const reviewTotal = (scores) =>
  CRITERIA.reduce((s, c) => s + (Number(scores?.[c.key]?.rating) || 0), 0);

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

  // Batch: all finished reviews for the caller's apps in ONE query (was N+1).
  const appIds = (apps || []).map((a) => a.id);
  const revsByAppTour = {}; // `${appId}:${tour}` → [reviews]
  if (appIds.length) {
    const { data: allRevs } = await admin
      .from('application_reviews').select('application_id, tour, scores, status')
      .in('application_id', appIds);
    (allRevs || []).filter((r) => r.status === 'finished').forEach((r) => {
      (revsByAppTour[`${r.application_id}:${r.tour || 1}`] ||= []).push(r);
    });
  }

  // Winner places: rank winners by tour-2 mean total score, but ONLY against the
  // other winners of the SAME edition — never pooled across editions.
  const { data: allWinners } = await admin.from('applications').select('id, edition').eq('standing', 'winner');
  const winnerIds = (allWinners || []).map((w) => w.id);
  const placeByApp = new Map();
  if (winnerIds.length) {
    const { data: wrevs } = await admin
      .from('application_reviews').select('application_id, scores, status')
      .eq('tour', 2).in('application_id', winnerIds);
    const totals = {};
    (wrevs || []).filter((r) => r.status === 'finished').forEach((r) => {
      (totals[r.application_id] ||= []).push(reviewTotal(r.scores));
    });
    const meanScore = (wid) => (totals[wid]?.length ? totals[wid].reduce((a, b) => a + b, 0) / totals[wid].length : -1);
    const byEdition = {};
    (allWinners || []).forEach((w) => { (byEdition[w.edition || 1] ||= []).push(w.id); });
    Object.values(byEdition).forEach((ids) => {
      ids
        .map((wid) => ({ id: wid, score: meanScore(wid) }))
        .sort((a, b) => b.score - a.score)
        .forEach((s, i) => placeByApp.set(s.id, i + 1));
    });
  }

  const currentEdition = cyc?.current_edition || 1;
  const out = [];
  for (const app of apps || []) {
    // Past editions are final history — show all tours. Current edition only
    // reveals a tour once the admin has sent its results.
    const archived = (app.edition || 1) < currentEdition;
    const tours = [];
    for (const t of [1, 2]) {
      const sent = archived || (t === 1 ? cyc?.tour1_results_sent : cyc?.tour2_results_sent);
      if (!sent) continue;
      if (t === 2 && (app.tour || 1) < 2) continue; // never reached tour 2

      const finished = revsByAppTour[`${app.id}:${t}`] || [];
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
      const place = t === 2 && app.standing === 'winner' ? (placeByApp.get(app.id) || null) : null;

      tours.push({ tour: t, outcome, place, feedback });
    }
    if (tours.length) out.push({ application_id: app.id, tours });
  }
  return json(200, { results: out, currentEdition: cyc?.current_edition || 1 });
}

export async function handler(event) {
  const env = process.env;
  const admin = makeAdmin(env);
  const auth = event.headers?.authorization || event.headers?.Authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '') || null;
  return handleMyResults({ admin }, { token });
}
