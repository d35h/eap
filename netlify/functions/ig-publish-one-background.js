import { makeAdmin } from './_lib/supabaseAdmin.js';
import { publishApplication } from './_lib/igPost.js';

// Admin: manually publish one application to Instagram. This is a *background*
// function (Netlify runs it async with a long timeout) because building a
// carousel + waiting for Instagram to process the media can exceed the 10s
// sync limit. The client polls the application's published_at for the result.
export async function handler(event) {
  const env = process.env;
  const admin = makeAdmin(env);
  const auth = event.headers?.authorization || event.headers?.Authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '') || null;
  const { applicationId } = JSON.parse(event.body || '{}');

  if (!token) return { statusCode: 401 };
  const { data: caller, error: authErr } = await admin.auth.getUser(token);
  if (authErr || caller?.user?.app_metadata?.role !== 'admin') return { statusCode: 403 };
  if (!applicationId) return { statusCode: 400 };

  const { data: app } = await admin.from('applications').select('*').eq('id', applicationId).maybeSingle();
  if (!app || app.payment_status !== 'paid' || app.published_at) return { statusCode: 200 };
  const { data: cyc } = await admin.from('cycle_state').select('current_edition').eq('id', 1).maybeSingle();
  if ((app.edition || 1) !== (cyc?.current_edition || 1)) return { statusCode: 200 };

  try {
    await publishApplication(admin, env, app);
  } catch (e) {
    console.error('manual IG publish failed:', e?.message || e);
  }
  return { statusCode: 200 };
}
