import { makeAdmin } from './_lib/supabaseAdmin.js';
import { getIgToken } from './_lib/igToken.js';
import { publishApplication } from './_lib/igPost.js';

// Daily scheduled function (netlify.toml): publish the next unpublished paid
// application of the current edition to Instagram. No-op without a token.
export async function handler() {
  const env = process.env;
  const admin = makeAdmin(env);
  const token = await getIgToken(admin, env);
  if (!token) return { statusCode: 200, body: 'IG not configured' };

  const { data: cyc } = await admin.from('cycle_state').select('current_edition').eq('id', 1).maybeSingle();
  const edition = cyc?.current_edition || 1;

  const { data: apps } = await admin
    .from('applications').select('*')
    .eq('edition', edition).eq('payment_status', 'paid').is('published_at', null)
    .order('created_at', { ascending: true }).limit(1);
  const app = apps?.[0];
  if (!app) return { statusCode: 200, body: 'nothing to publish' };

  try {
    const r = await publishApplication(admin, env, app);
    return { statusCode: 200, body: `${app.id}: ${r.status}${r.postId ? ' → ' + r.postId : ''}` };
  } catch (e) {
    console.error('IG publish failed:', e?.message || e);
    return { statusCode: 200, body: 'publish failed' };
  }
}
