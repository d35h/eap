import { sendEmail, inviteEmailHtml } from './email.js';

// Create a Supabase auth user for a paid application and link user_id.
// If RESEND_API_KEY is set, we generate the set-password link and send our own
// branded email via Resend; otherwise Supabase sends its default invite email.
// Safe no-op if the user already exists. Never throws to the webhook.
export async function createAccountForApplication({ admin, env }, { email, ref }) {
  const lower = (email || '').trim().toLowerCase();
  if (!lower) return;
  const redirectTo = `${env.PUBLIC_SITE_URL || ''}/set-password`;

  // Branded path: create the user + a set-password link, send it via Resend.
  if (env.RESEND_API_KEY) {
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'invite',
      email: lower,
      options: { redirectTo },
    });
    if (error) return; // user already exists, etc. — leave as-is
    const link = data?.properties?.action_link;
    const userId = data?.user?.id;
    if (link) {
      await sendEmail(env, {
        to: lower,
        subject: 'EAP — заявка оплачена, создайте пароль',
        html: inviteEmailHtml(link),
      });
    }
    if (userId) {
      await admin.from('applications').update({ user_id: userId }).eq('payment_ref', ref);
    }
    return;
  }

  // Fallback: Supabase sends the invite email via its configured SMTP.
  const { data, error } = await admin.auth.admin.inviteUserByEmail(lower, { redirectTo });
  if (error) return;
  const userId = data?.user?.id;
  if (userId) {
    await admin.from('applications').update({ user_id: userId }).eq('payment_ref', ref);
  }
}
