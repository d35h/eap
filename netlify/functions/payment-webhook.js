import { makeAdmin } from './_lib/supabaseAdmin.js';
import { getProvider } from './_lib/providers/index.js';
import { json } from './_lib/json.js';

export async function handleWebhook({ admin, channel }, req) {
  const provider = getProvider(channel);
  const { ref, paid } = provider.verifyWebhook(req);
  if (!paid) return json(200, { ignored: true });

  const { error } = await admin
    .from('applications')
    .update({ payment_status: 'paid' })
    .eq('payment_ref', ref);
  if (error) return json(500, { error: error.message });

  // PHASE 3 HOOK: create the Supabase auth user for this application's email
  // and trigger the confirmation email. Added in the accounts plan.

  return json(200, { ok: true });
}

export async function handler(event) {
  const env = process.env;
  const channel = (event.queryStringParameters && event.queryStringParameters.channel) || env.PAYMENTS_PROVIDER || 'mock';
  return handleWebhook({ admin: makeAdmin(env), channel }, { headers: event.headers, body: event.body });
}
