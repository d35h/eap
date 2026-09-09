import { describe, it, expect, vi, afterEach } from 'vitest';

// The module reads the URL fragment once, at import - so each case sets the
// fragment up and imports it fresh.
async function routeFor(hash) {
  vi.resetModules();
  globalThis.window = { location: { hash } };
  const { takeAuthCallbackRoute } = await import('./authCallback.js');
  return takeAuthCallbackRoute();
}

afterEach(() => { delete globalThis.window; });

const session = 'access_token=a&refresh_token=r&token_type=bearer';

describe('takeAuthCallbackRoute', () => {
  it('sends an invited juror to the password form', async () => {
    // The live failure: Supabase dropped /set-password from the invite link, so
    // the juror arrived signed in on the landing page with nothing to do.
    expect(await routeFor(`#${session}&type=invite`)).toBe('/set-password');
  });

  it('sends a password recovery to the password form', async () => {
    expect(await routeFor(`#${session}&type=recovery`)).toBe('/set-password');
  });

  it('sends a magic login to the cabinet, not the password form', async () => {
    expect(await routeFor(`#${session}&type=magiclink`)).toBe('/account');
  });

  it('leaves an ordinary anchor link alone', async () => {
    expect(await routeFor('#manifest')).toBeNull();
    expect(await routeFor('')).toBeNull();
  });

  it('ignores a fragment that names a type but carries no session', async () => {
    expect(await routeFor('#type=invite')).toBeNull();
  });

  it('ignores a callback type it has no page for', async () => {
    expect(await routeFor(`#${session}&type=email_change`)).toBeNull();
  });

  it('is spent after it is read, so it cannot bounce the user twice', async () => {
    vi.resetModules();
    globalThis.window = { location: { hash: `#${session}&type=invite` } };
    const { takeAuthCallbackRoute } = await import('./authCallback.js');
    expect(takeAuthCallbackRoute()).toBe('/set-password');
    expect(takeAuthCallbackRoute()).toBeNull();
  });
});
