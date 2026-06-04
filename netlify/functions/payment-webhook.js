import { makeAdmin } from './_lib/supabaseAdmin.js';
import { getProvider } from './_lib/providers/index.js';
import { json } from './_lib/json.js';
import { createAccountForApplication } from './_lib/accounts.js';

export async function handleWebhook({ admin, channel, env }, req) {
  const provider = getProvider(channel);
  const { ref, paid } = provider.verifyWebhook(req);
  if (!paid) return json(200, { ignored: true });

  const { error } = await admin
    .from('applications')
    .update({ payment_status: 'paid' })
    .eq('payment_ref', ref);
  if (error) return json(500, { error: error.message });

  // load email + language for the paid ref, then create the account
  const { data: app } = await admin.from('applications').select('email, lang').eq('payment_ref', ref).single();
  if (app?.email) {
    await createAccountForApplication({ admin, env }, { email: app.email, ref, lang: app.lang });
  }

  return json(200, { ok: true });
}

export async function handler(event) {
  const env = process.env;
  const channel = (event.queryStringParameters && event.queryStringParameters.channel) || env.PAYMENTS_PROVIDER || 'mock';
  return handleWebhook({ admin: makeAdmin(env), channel, env }, { headers: event.headers, body: event.body });
}
