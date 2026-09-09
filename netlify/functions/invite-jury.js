import { makeAdmin } from './_lib/supabaseAdmin.js';
import { sendEmail, juryInviteEmail } from './_lib/email.js';
import { json } from './_lib/json.js';
import { envForRequest } from './_lib/siteUrl.js';
import { rewrittenRedirect } from './_lib/authLink.js';

// Invite a juror.
//
// This used to answer "Приглашение отправлено." whether or not anything was
// sent: no mail transport configured, provider refusing the send, no link to
// send - all three ended in the same cheerful success, with the real reason
// written to a log nobody reads. So an admin could invite the same person five
// times and never learn that the sending domain was unverified. An invitation
// nobody receives is not an invitation; the delivery result is the answer.
//
// Pure core (testable): deps injected.
//   token = the caller's access token (must belong to an admin)
//   email = the invitee, name = display name the admin assigns
// Returns { status: 'invited' | 'exists' } or an error envelope.
export async function handleInviteJury({ admin, env, send }, { token, email, name }) {
  // 1. Authorize: only an admin may invite jurors.
  if (!token) return json(401, { error: 'unauthorized' });
  const { data: caller, error: authErr } = await admin.auth.getUser(token);
  if (authErr || caller?.user?.app_metadata?.role !== 'admin') {
    return json(403, { error: 'forbidden' });
  }

  const lower = (email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lower)) {
    return json(400, { error: 'invalid email' });
  }
  const displayName = (name || '').trim();

  // 2. Refuse before creating an account we could never tell anyone about.
  if (!env.RESEND_API_KEY) {
    return json(503, { error: 'mail transport not configured', code: 'no_transport', status: 'undelivered' });
  }

  const site = env.PUBLIC_SITE_URL || '';
  const redirectTo = `${site}/set-password`;

  // 3. Generate an invite link. If the user already exists, generateLink errors.
  const gen = await admin.auth.admin.generateLink({
    type: 'invite',
    email: lower,
    options: { redirectTo },
  });
  if (gen.error) {
    // "Already registered" is a normal answer and has its own message in the
    // cabinet. Anything else is a fault, and must not be dressed up as one.
    const msg = gen.error?.message || '';
    if (gen.error?.code === 'email_exists' || /already/i.test(msg)) {
      return json(200, { status: 'exists' });
    }
    console.error('invite-jury: could not generate invite link:', msg);
    return json(502, { error: 'could not generate an invite link', status: 'error' });
  }

  // 4. Stamp the juror role + admin-assigned name into app_metadata
  //    (tamper-proof, rides in the JWT).
  const userId = gen.data?.user?.id;
  if (userId) {
    await admin.auth.admin.updateUserById(userId, {
      app_metadata: { role: 'juror', name: displayName },
    });
  }

  const link = gen.data?.properties?.action_link;
  if (!link) {
    console.error('invite-jury: Supabase returned no action link');
    return json(502, { error: 'could not generate an invite link', status: 'error' });
  }

  // Supabase silently drops a redirect it does not recognise. The invite still
  // sends, but it lands the juror short of the password form - worth saying so.
  const elsewhere = rewrittenRedirect(link, redirectTo);
  if (elsewhere) {
    console.error(
      `invite-jury: Supabase overrode the redirect (asked ${redirectTo}, got ${elsewhere}). ` +
      'Add the site to Authentication → URL Configuration → Redirect URLs.'
    );
  }

  // 5. Email the invite (Russian) via Resend.
  const { subject, html } = juryInviteEmail(link);
  try {
    await sendEmail(env, { to: lower, subject, html }, send);
  } catch (e) {
    console.error('invite-jury: provider rejected the send:', e?.message || e);
    return json(502, {
      error: 'the invitation could not be delivered',
      status: 'undelivered',
      provider: e?.status ?? null,
      code: e?.code ?? null,
    });
  }

  return json(200, { status: 'invited' });
}

// Netlify entrypoint.
export async function handler(event) {
  // The links this makes must point at the host we are actually served from.
  const env = envForRequest(event, process.env);
  const admin = makeAdmin(env);
  const auth = event.headers?.authorization || event.headers?.Authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '') || null;
  const body = JSON.parse(event.body || '{}');
  return handleInviteJury({ admin, env, send: fetch }, { token, email: body.email, name: body.name });
}
