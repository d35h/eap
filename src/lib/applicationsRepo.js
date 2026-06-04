import { supabase } from './supabase.js';

const AMOUNT_BY_TIER = { 1: 100, 2: 150, 3: 170 };

function currentLang() {
  try {
    return localStorage.getItem('eap-lang') || 'ru';
  } catch {
    return 'ru';
  }
}

function newId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// Insert a pending application. `client` is injected for testability.
// The id is generated client-side so we never need to read the row back
// (anon has no SELECT policy - INSERT ... RETURNING would be blocked by RLS).
export async function createApplication(client, form) {
  const id = newId();
  const payload = {
    id,
    email: (form.email || '').trim().toLowerCase(),
    first_name: form.firstName || '',
    last_name: form.lastName || '',
    country: form.country || '',
    city: form.city || '',
    website: form.website || '',
    instagram: form.instagram || '',
    works: (form.works || []).map((w) => ({
      title: w.title || '',
      year: w.year || '',
      media: w.media || '',
      size: w.size || '',
      desc: w.desc || '',
    })),
    tier: form.tier,
    amount: AMOUNT_BY_TIER[form.tier] ?? AMOUNT_BY_TIER[3],
    currency: 'BYN',
    payment_status: 'pending',
    lang: currentLang(),
  };

  const { error } = await client.from('applications').insert(payload);
  if (error) throw new Error(error.message);
  return payload;
}

// Bound to the real client for app use.
export function submitApplication(form) {
  if (!supabase) throw new Error('Supabase is not configured');
  return createApplication(supabase, form);
}

const extOf = (file) => {
  const fromName = (file.name || '').split('.').pop();
  return fromName && fromName.length <= 5 ? fromName.toLowerCase() : 'bin';
};

// Upload one file per work (index-aligned). Null entries are skipped.
// Returns an array of storage paths (null where no file).
export async function uploadWorkFiles(client, applicationId, files) {
  const paths = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file) {
      paths.push(null);
      continue;
    }
    const path = `applications/${applicationId}/work${i + 1}.${extOf(file)}`;
    // upsert:false → plain INSERT (anon has insert, not update, policy on storage).
    // Paths are unique per application id, so there's never a collision to overwrite.
    const { error } = await client.storage
      .from('works')
      .upload(path, file, { upsert: false });
    if (error) throw new Error(error.message);
    paths.push(path);
  }
  return paths;
}
