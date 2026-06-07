import { supabase } from './supabase.js';

// Read the cycle_state row (admin/staff via RLS).
export async function getCycle() {
  if (!supabase) return null;
  const { data } = await supabase.from('cycle_state').select('*').eq('id', 1).maybeSingle();
  return data || null;
}

// Admin toggles whether new applications are accepted.
export async function setSubmissionsOpen(open) {
  return updateCycle({ submissions_open: open });
}

// Admin updates any cycle field(s) (RLS: admin only).
export async function updateCycle(patch) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { error } = await supabase
    .from('cycle_state')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', 1);
  if (error) throw new Error(error.message);
}

// Public effective state (open AND before deadline). Fails open on error.
export async function submissionsOpen() {
  if (!supabase) return true;
  const { data, error } = await supabase.rpc('submissions_open');
  if (error) return true;
  return !!data;
}
