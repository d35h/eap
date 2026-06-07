import { makeAdmin } from './_lib/supabaseAdmin.js';
import { sendEmail, juryInviteEmail } from './_lib/email.js';
import { json } from './_lib/json.js';

// Pure core (testable): deps injected.
//   token = the caller's access token (must belong to an admin)
//   email = the invitee, name = display name the admin assigns
// Returns { status: 'invited' | 'exists' } or an error envelope.
export async function handleInviteJury({ admin, env }, { token, email, name }) {
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

  const site = env.PUBLIC_SITE_URL || '';

  // 2. Generate an invite link. If the user already exists, generateLink errors.
  const gen = await admin.auth.admin.generateLink({
    type: 'invite',
    email: lower,
    options: { redirectTo: `${site}/set-password` },
  });
  if (gen.error) {
    // Already registered (or some other GoTrue error) → tell the admin clearly.
    return json(200, { status: 'exists' });
  }

  // 3. Stamp the juror role + admin-assigned name into app_metadata
  //    (tamper-proof, rides in the JWT).
  const userId = gen.data?.user?.id;
  if (userId) {
    await admin.auth.admin.updateUserById(userId, {
      app_metadata: { role: 'juror', name: displayName },
    });
  }

  // 4. Email the invite (Russian) via Resend.
  const link = gen.data?.properties?.action_link;
  if (link && env.RESEND_API_KEY) {
    const { subject, html } = juryInviteEmail(link);
    try {
      await sendEmail(env, { to: lower, subject, html });
    } catch (e) {
      console.error('jury invite email failed:', e?.message || e);
    }
  }

  return json(200, { status: 'invited' });
}

// Netlify entrypoint.
export async function handler(event) {
  const env = process.env;
  const admin = makeAdmin(env);
  const auth = event.headers?.authorization || event.headers?.Authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '') || null;
  const body = JSON.parse(event.body || '{}');
  return handleInviteJury({ admin, env }, { token, email: body.email, name: body.name });
}
