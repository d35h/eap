import { sendEmail, paidEmailHtml, emailCopy } from './email.js';

// Create/locate the Supabase auth user for a paid application, link user_id, and
// email them (in their language) via Resend:
//   • new applicant  → an INVITE link (set a password)
//   • returning user → a MAGIC LOGIN link to their account
// Falls back to Supabase's default invite email when RESEND_API_KEY is absent.
// Best-effort: never throws to the webhook.
export async function createAccountForApplication({ admin, env }, { email, ref, lang }) {
  try {
    const lower = (email || '').trim().toLowerCase();
    if (!lower) return;
    const site = env.PUBLIC_SITE_URL || '';

    if (env.RESEND_API_KEY) {
      // New user: invite + set-password link.
      let mode = 'invite';
      let gen = await admin.auth.admin.generateLink({
        type: 'invite',
        email: lower,
        options: { redirectTo: `${site}/set-password` },
      });
      // Existing user: invite fails → send a magic login link to the cabinet.
      if (gen.error) {
        mode = 'login';
        gen = await admin.auth.admin.generateLink({
          type: 'magiclink',
          email: lower,
          options: { redirectTo: `${site}/account` },
        });
      }
      if (gen.error) return; // couldn't generate either link

      const userId = gen.data?.user?.id;
      const link = gen.data?.properties?.action_link;
      if (userId) {
        await admin.from('applications').update({ user_id: userId }).eq('payment_ref', ref);
      }
      if (link) {
        await sendEmail(env, {
          to: lower,
          subject: emailCopy(lang).subject,
          html: paidEmailHtml(link, lang, mode),
        });
      }
      return;
    }

    // Fallback: Supabase sends the invite email via its configured SMTP.
    const { data, error } = await admin.auth.admin.inviteUserByEmail(lower, {
      redirectTo: `${site}/set-password`,
    });
    if (error) return;
    const userId = data?.user?.id;
    if (userId) {
      await admin.from('applications').update({ user_id: userId }).eq('payment_ref', ref);
    }
  } catch (e) {
    console.error('createAccountForApplication failed (non-fatal):', e?.message || e);
  }
}
