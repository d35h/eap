// Supabase's generateLink does not fail when the `redirectTo` we ask for is
// missing from the project's Redirect Allow List. It silently substitutes the
// project's Site URL - path and all - and hands back a link that works, just not
// for what we needed it for: the recipient lands on the landing page instead of
// /set-password, so an invited juror is signed in but never asked for a
// password. Nothing anywhere reports this. This makes it visible.
//
// Returns the substituted destination when Supabase overrode us, else null.
export function rewrittenRedirect(actionLink, asked) {
  if (!actionLink || !asked) return null;
  let got;
  try {
    got = new URL(actionLink).searchParams.get('redirect_to');
  } catch {
    return null; // not a URL we can read; nothing to claim
  }
  if (!got) return null;
  return got === asked ? null : got;
}
