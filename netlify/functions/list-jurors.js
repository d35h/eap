import { makeAdmin } from './_lib/supabaseAdmin.js';
import { json } from './_lib/json.js';

// Return every juror ({ id, email }) so the admin can show review status per
// juror per application. Admin-authorized.
export async function handleListJurors({ admin }, { token }) {
  if (!token) return json(401, { error: 'unauthorized' });
  const { data: caller, error: authErr } = await admin.auth.getUser(token);
  if (authErr || caller?.user?.app_metadata?.role !== 'admin') {
    return json(403, { error: 'forbidden' });
  }
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) return json(500, { error: 'list failed' });
  const jurors = (data?.users || [])
    .filter((u) => (u.app_metadata || {}).role === 'juror')
    .map((u) => ({ id: u.id, email: u.email }));
  return json(200, { jurors });
}

export async function handler(event) {
  const env = process.env;
  const admin = makeAdmin(env);
  const auth = event.headers?.authorization || event.headers?.Authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '') || null;
  return handleListJurors({ admin }, { token });
}
