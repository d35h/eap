import { describe, it, expect } from 'vitest';
import { siteUrl, envForRequest } from './siteUrl.js';

describe('siteUrl', () => {
  it('uses the host the request actually arrived on', () => {
    const event = { headers: { host: 'eurasiaartplatform.com', 'x-forwarded-proto': 'https' } };
    expect(siteUrl(event, { PUBLIC_SITE_URL: 'https://myeap.xyz' })).toBe('https://eurasiaartplatform.com');
  });

  it('ignores a stale PUBLIC_SITE_URL rather than trusting it', () => {
    // The whole point: the variable went stale and nothing failed loudly.
    const event = { headers: { host: 'eurasiaartplatform.com' } };
    expect(siteUrl(event, { PUBLIC_SITE_URL: 'https://dead.example' })).not.toContain('dead');
  });

  it('falls back to the variable when there is no request behind the call', () => {
    expect(siteUrl(undefined, { PUBLIC_SITE_URL: 'https://site/' })).toBe('https://site');
  });

  it('honours the forwarded protocol', () => {
    const event = { headers: { host: 'localhost:8888', 'x-forwarded-proto': 'http' } };
    expect(siteUrl(event, {})).toBe('http://localhost:8888');
  });

  it('reads a capitalised Host header too', () => {
    expect(siteUrl({ headers: { Host: 'eap.art' } }, {})).toBe('https://eap.art');
  });

  it('returns an empty string rather than a broken URL when nothing is known', () => {
    expect(siteUrl({}, {})).toBe('');
  });

  it('hands a handler an environment whose site URL is the live one', () => {
    const env = envForRequest(
      { headers: { host: 'eurasiaartplatform.com' } },
      { PUBLIC_SITE_URL: 'https://myeap.xyz', OTHER: 'kept' },
    );
    expect(env.PUBLIC_SITE_URL).toBe('https://eurasiaartplatform.com');
    expect(env.OTHER).toBe('kept');
  });
});
