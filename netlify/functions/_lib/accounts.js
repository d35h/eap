// Create (invite) a Supabase auth user for a paid application and link user_id.
// Safe no-op if the user already exists. Never throws to the webhook.
export async function createAccountForApplication({ admin, env }, { email, ref }) {
  const lower = (email || '').trim().toLowerCase();
  if (!lower) return;
  const redirectTo = `${env.PUBLIC_SITE_URL || ''}/set-password`;
  const { data, error } = await admin.auth.admin.inviteUserByEmail(lower, { redirectTo });
  if (error) {
    // Most common: user already exists — leave their account/link as-is.
    return;
  }
  const userId = data?.user?.id;
  if (userId) {
    await admin.from('applications').update({ user_id: userId }).eq('payment_ref', ref);
  }
}
