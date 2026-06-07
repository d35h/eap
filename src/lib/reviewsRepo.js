import { supabase } from './supabase.js';

// Data access for juror evaluations (application_reviews). All calls are
// RLS-governed: jurors touch only their own rows; admins read all + unlock.

// The current juror's own review row for an application in a tour (or null).
export async function getMyReview(applicationId, userId, tour = 1) {
  if (!supabase) return null;
  const { data } = await supabase
    .from('application_reviews')
    .select('*')
    .eq('application_id', applicationId)
    .eq('reviewer_id', userId)
    .eq('tour', tour)
    .maybeSingle();
  return data || null;
}

// Upsert the juror's row for a tour. `status` is 'draft' or 'finished'. Always
// writes unlocked=false (RLS forbids a juror setting it true).
async function upsertReview({ applicationId, userId, email, scores, status, tour = 1 }) {
  if (!supabase) throw new Error('Supabase is not configured');
  const row = {
    application_id: applicationId,
    reviewer_id: userId,
    reviewer_email: email || '',
    scores: scores || {},
    status,
    unlocked: false,
    tour,
    updated_at: new Date().toISOString(),
    finished_at: status === 'finished' ? new Date().toISOString() : null,
  };
  const { error } = await supabase
    .from('application_reviews')
    .upsert(row, { onConflict: 'application_id,reviewer_id,tour' });
  if (error) throw new Error(error.message);
}

export function saveDraft(args) {
  return upsertReview({ ...args, status: 'draft' });
}

export function finishReview(args) {
  return upsertReview({ ...args, status: 'finished' });
}

// Admin: reopen a specific juror's finished evaluation for editing.
export async function unlockReview(reviewId) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { error } = await supabase
    .from('application_reviews')
    .update({ unlocked: true, status: 'draft' })
    .eq('id', reviewId);
  if (error) throw new Error(error.message);
}
