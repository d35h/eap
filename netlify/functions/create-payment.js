import { makeAdmin } from './_lib/supabaseAdmin.js';
import { getProvider } from './_lib/providers/index.js';
import { amountFor } from './_lib/pricing.js';
import { json } from './_lib/json.js';
import { envForRequest } from './_lib/siteUrl.js';

// Pure core (testable): deps injected.
export async function handlePayment({ admin, env }, input) {
  const { applicationId, channel } = input || {};
  if (!applicationId || !channel) return json(400, { error: 'applicationId and channel required' });

  const { data: app, error } = await admin
    .from('applications').select('*').eq('id', applicationId).single();
  if (error || !app) return json(404, { error: 'application not found' });

  // Guard: every work must have its uploaded file before payment can start.
  // The client uploads files before calling this, so a legit application always
  // passes — this rejects bypass attempts that skip the upload step.
  const works = Array.isArray(app.works) ? app.works : [];
  if (works.length === 0) return json(400, { error: 'no works', code: 'missing_files' });
  const { data: list } = await admin.storage.from('works').list(`applications/${applicationId}`);
  const uploaded = new Set(
    (list || []).map((f) => (/^work(\d+)\./.exec(f.name) || [])[1]).filter(Boolean),
  );
  const allUploaded = works.every((_, i) => uploaded.has(String(i + 1)));
  if (!allUploaded) return json(400, { error: 'every work must have an uploaded file', code: 'missing_files' });

  let provider;
  try { provider = getProvider(channel); }
  catch { return json(400, { error: 'unknown channel' }); }
  const amount = amountFor(app.tier);
  const returnUrl = `${env.PUBLIC_SITE_URL || ''}/apply`;
  const session = provider.createSession({ applicationId, channel, amount, returnUrl });

  await admin.from('applications')
    .update({ payment_provider: channel, payment_ref: session.ref })
    .eq('id', applicationId);

  return json(200, { redirectUrl: session.redirectUrl });
}

// Netlify entrypoint.
export async function handler(event) {
  // The links this makes must point at the host we are actually served from.
  const env = envForRequest(event, process.env);
  const admin = makeAdmin(env);
  return handlePayment({ admin, env }, JSON.parse(event.body || '{}'));
}
