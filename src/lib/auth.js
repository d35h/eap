import { supabase } from './supabase.js';

export async function signIn(email, password) {
  if (!supabase) throw new Error('Auth not configured');
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw new Error(error.message);
  return data.user;
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut();
}

export async function setPassword(password) {
  if (!supabase) throw new Error('Auth not configured');
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(error.message);
}

// Reset is sent by us (Resend, branded) — a Netlify function generates the
// recovery link server-side. Always resolves; the endpoint is enumeration-safe.
export async function requestPasswordReset(email, lang) {
  await fetch('/.netlify/functions/request-password-reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase(), lang }),
  });
}
