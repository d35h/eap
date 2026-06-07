import { makeAdmin } from './_lib/supabaseAdmin.js';
import { json } from './_lib/json.js';

// Start a new edition: bump current_edition (archives the previous one by
// number), reset submissions/tours/flags, and revoke all jurors (delete their
// auth accounts - reviews are kept via ON DELETE SET NULL). Admin-authorized.
export async function handleStartNewCycle({ admin }, { token }) {
  if (!token) return json(401, { error: 'unauthorized' });
  const { data: caller, error: authErr } = await admin.auth.getUser(token);
  if (authErr || caller?.user?.app_metadata?.role !== 'admin') {
    return json(403, { error: 'forbidden' });
  }

  const { data: cyc } = await admin.from('cycle_state').select('current_edition').eq('id', 1).maybeSingle();
  const nextEdition = (cyc?.current_edition || 1) + 1;

  await admin.from('cycle_state').update({
    current_edition: nextEdition,
    submissions_open: true,
    active_tour: 1,
    tour1_open: false,
    tour2_open: false,
    tour1_results_sent: false,
    tour2_results_sent: false,
    updated_at: new Date().toISOString(),
  }).eq('id', 1);

  // Revoke all jurors.
  let revoked = 0;
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const u of data?.users || []) {
    if ((u.app_metadata || {}).role === 'juror') {
      await admin.auth.admin.deleteUser(u.id);
      revoked++;
    }
  }

  return json(200, { ok: true, edition: nextEdition, jurorsRevoked: revoked });
}

export async function handler(event) {
  const env = process.env;
  const admin = makeAdmin(env);
  const auth = event.headers?.authorization || event.headers?.Authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '') || null;
  return handleStartNewCycle({ admin }, { token });
}
