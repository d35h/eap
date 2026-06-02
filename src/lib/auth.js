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
