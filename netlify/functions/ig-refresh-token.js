import { makeAdmin } from './_lib/supabaseAdmin.js';
import { getIgToken, setIgToken } from './_lib/igToken.js';

// Weekly scheduled function (netlify.toml): refresh the long-lived Instagram
// token so it never lapses (each refresh extends it ~60 days).
export async function handler() {
  const env = process.env;
  const admin = makeAdmin(env);
  const current = await getIgToken(admin, env);
  if (!current) return { statusCode: 200, body: 'no token' };

  const res = await fetch(
    `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${current}`
  );
  const d = await res.json().catch(() => ({}));
  if (d.access_token) {
    await setIgToken(admin, d.access_token);
    return { statusCode: 200, body: `refreshed, expires_in=${d.expires_in}` };
  }
  console.error('IG token refresh failed:', JSON.stringify(d));
  return { statusCode: 200, body: 'refresh failed' };
}
