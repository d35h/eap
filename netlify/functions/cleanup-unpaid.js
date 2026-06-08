import { makeAdmin } from './_lib/supabaseAdmin.js';

// Scheduled (netlify.toml): remove abandoned applications that were created but
// never paid for, plus their uploaded work files. An application must be created
// as 'pending' before payment (so the provider can attach to it), so unpaid
// drafts accumulate — this deletes the ones still pending past the grace window.
// Recent pending rows (in-progress payments) are left alone.
export async function handler() {
  const env = process.env;
  const admin = makeAdmin(env);
  const graceHours = Number(env.UNPAID_GRACE_HOURS) || 48;
  const cutoff = new Date(Date.now() - graceHours * 3600 * 1000).toISOString();

  const { data: stale } = await admin
    .from('applications').select('id')
    .eq('payment_status', 'pending')
    .lt('created_at', cutoff);

  let removed = 0;
  for (const a of stale || []) {
    const folder = `applications/${a.id}`;
    const { data: list } = await admin.storage.from('works').list(folder);
    if (list?.length) {
      await admin.storage.from('works').remove(list.map((f) => `${folder}/${f.name}`));
    }
    const { error } = await admin.from('applications').delete().eq('id', a.id);
    if (!error) removed += 1;
  }
  return { statusCode: 200, body: `removed ${removed} unpaid application(s) older than ${graceHours}h` };
}
