import { makeAdmin } from './_lib/supabaseAdmin.js';
import { publishApplication } from './_lib/igPost.js';
import { json } from './_lib/json.js';

// Admin: manually publish a specific application to Instagram (if not already).
export async function handlePublishOne({ admin, env }, { token, applicationId }) {
  if (!token) return json(401, { error: 'unauthorized' });
  const { data: caller, error: authErr } = await admin.auth.getUser(token);
  if (authErr || caller?.user?.app_metadata?.role !== 'admin') {
    return json(403, { error: 'forbidden' });
  }
  if (!applicationId) return json(400, { error: 'applicationId required' });

  const { data: app } = await admin.from('applications').select('*').eq('id', applicationId).maybeSingle();
  if (!app) return json(404, { error: 'application not found' });
  if (app.payment_status !== 'paid') return json(400, { error: 'not paid' });
  if (app.published_at) return json(200, { status: 'already_published' });

  try {
    const r = await publishApplication(admin, env, app);
    return json(200, r);
  } catch (e) {
    console.error('manual IG publish failed:', e?.message || e);
    return json(200, { status: 'error', error: String(e?.message || e) });
  }
}

export async function handler(event) {
  const env = process.env;
  const admin = makeAdmin(env);
  const auth = event.headers?.authorization || event.headers?.Authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '') || null;
  const body = JSON.parse(event.body || '{}');
  return handlePublishOne({ admin, env }, { token, applicationId: body.applicationId });
}
