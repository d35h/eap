import { makeAdmin } from './_lib/supabaseAdmin.js';
import { json } from './_lib/json.js';

// Apply an admin-confirmed tour transition (bulk standings change → service role).
//   action 'advance'  : selected apps move to the next tour (standing 'active',
//                        tour+1); the rest are 'eliminated'.
//   action 'winners'  : selected apps become 'winner'; the rest 'eliminated'.
// Operates on the paid, still-active applications in `tour`.
export async function handleTransition({ admin }, { token, action, tour, advanceIds }) {
  if (!token) return json(401, { error: 'unauthorized' });
  const { data: caller, error: authErr } = await admin.auth.getUser(token);
  if (authErr || caller?.user?.app_metadata?.role !== 'admin') {
    return json(403, { error: 'forbidden' });
  }
  if (!['advance', 'winners'].includes(action)) return json(400, { error: 'bad action' });
  const t = Number(tour) || 1;
  const ids = new Set(Array.isArray(advanceIds) ? advanceIds : []);

  const { data: apps, error } = await admin
    .from('applications')
    .select('id')
    .eq('payment_status', 'paid')
    .eq('standing', 'active')
    .eq('tour', t);
  if (error) return json(500, { error: 'load failed' });

  let advanced = 0;
  for (const a of apps) {
    if (ids.has(a.id)) {
      const patch = action === 'winners' ? { standing: 'winner' } : { standing: 'active', tour: t + 1 };
      await admin.from('applications').update(patch).eq('id', a.id);
      advanced++;
    } else {
      await admin.from('applications').update({ standing: 'eliminated' }).eq('id', a.id);
    }
  }
  return json(200, { ok: true, advanced, eliminated: apps.length - advanced });
}

export async function handler(event) {
  const env = process.env;
  const admin = makeAdmin(env);
  const auth = event.headers?.authorization || event.headers?.Authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '') || null;
  const body = JSON.parse(event.body || '{}');
  return handleTransition({ admin }, {
    token,
    action: body.action,
    tour: body.tour,
    advanceIds: body.advanceIds,
  });
}
