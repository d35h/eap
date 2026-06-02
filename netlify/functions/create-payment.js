import { makeAdmin } from './_lib/supabaseAdmin.js';
import { getProvider } from './_lib/providers/index.js';
import { amountFor } from './_lib/pricing.js';
import { json } from './_lib/json.js';

// Pure core (testable): deps injected.
export async function handlePayment({ admin, env }, input) {
  const { applicationId, channel } = input || {};
  if (!applicationId || !channel) return json(400, { error: 'applicationId and channel required' });

  const { data: app, error } = await admin
    .from('applications').select('*').eq('id', applicationId).single();
  if (error || !app) return json(404, { error: 'application not found' });

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
  const env = process.env;
  const admin = makeAdmin(env);
  return handlePayment({ admin, env }, JSON.parse(event.body || '{}'));
}
