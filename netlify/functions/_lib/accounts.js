import { sendEmail, inviteEmailHtml } from './email.js';

// Create a Supabase auth user for a paid application and link user_id.
// If RESEND_API_KEY is set, generate the set-password link and send our own
// branded email via Resend; otherwise Supabase sends its default invite email.
// Best-effort: never throws to the webhook (a failure here must not break the
// already-confirmed payment).
export async function createAccountForApplication({ admin, env }, { email, ref }) {
  try {
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
      const userId = data?.user?.id;
      const link = data?.properties?.action_link;
      if (userId) {
        await admin.from('applications').update({ user_id: userId }).eq('payment_ref', ref);
      }
      if (link) {
        await sendEmail(env, {
          to: lower,
          subject: 'EAP — заявка оплачена, создайте пароль',
          html: inviteEmailHtml(link),
        });
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
  } catch (e) {
    console.error('createAccountForApplication failed (non-fatal):', e?.message || e);
  }
}
