import { createClient } from '@supabase/supabase-js';

// Server-side client using the SECRET service-role key. Never import in client code.
export function makeAdmin(env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}
