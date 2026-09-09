// Where an auth callback was actually trying to go.
//
// Supabase returns an invite / recovery / magic-link result in the URL fragment,
// and the Supabase client consumes and erases that fragment the moment it
// initialises. So the fragment is read here, at module load, before the client
// exists - which is why this module is imported first in main.jsx.
//
// It matters because Supabase silently substitutes its own Site URL for any
// redirect it does not recognise, dropping the path along with it. An invited
// juror who should arrive at /set-password arrives at the landing page instead:
// signed in, with no password set and nothing on screen asking for one, which
// looks exactly like an invitation that never worked. Wherever the callback
// lands, this is what sends it on to the page that can finish the job.

const ROUTE_FOR_TYPE = {
  invite: '/set-password',
  recovery: '/set-password',
  signup: '/account',
  magiclink: '/account',
};

function readRoute() {
  if (typeof window === 'undefined') return null;
  const raw = window.location.hash || '';
  const params = new URLSearchParams(raw.startsWith('#') ? raw.slice(1) : raw);
  // A real callback carries a session in the fragment. An in-page anchor
  // (#manifest, #process) carries nothing, and must be left alone.
  if (!params.get('access_token')) return null;
  return ROUTE_FOR_TYPE[params.get('type')] || null;
}

let pending = readRoute();

// Reads once: the callback is spent after the app has acted on it.
export function takeAuthCallbackRoute() {
  const route = pending;
  pending = null;
  return route;
}
