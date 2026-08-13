// Where this deployment actually lives.
//
// PUBLIC_SITE_URL is hand-set in the dashboard, so it goes stale the moment the
// domain changes and nothing fails loudly when it does. It was still pointing at
// myeap.xyz, which no longer resolves - which meant every payment redirect and
// every link the platform emails (password resets, jury invitations, tour
// results) sent people to a host that answers nothing.
//
// The request knows the truth. The variable is only the fallback now, for the
// case where a function runs with no request behind it.
export function siteUrl(event, env = {}) {
  const headers = event?.headers || {};
  const host = headers.host || headers.Host;
  if (host) {
    const proto = headers['x-forwarded-proto'] || headers['X-Forwarded-Proto'] || 'https';
    return `${proto}://${host}`.replace(/\/+$/, '');
  }
  return String(env.PUBLIC_SITE_URL || '').replace(/\/+$/, '');
}

// The environment a handler should run with: identical to the process
// environment, except that the site URL is the one we are actually served from.
export function envForRequest(event, env) {
  return { ...env, PUBLIC_SITE_URL: siteUrl(event, env) };
}
