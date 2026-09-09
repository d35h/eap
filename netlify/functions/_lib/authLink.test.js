import { describe, it, expect } from 'vitest';
import { rewrittenRedirect } from './authLink.js';

const link = (redirect) =>
  `https://p.supabase.co/auth/v1/verify?token=abc&type=invite&redirect_to=${redirect}`;

describe('rewrittenRedirect', () => {
  it('says nothing when the link goes where we asked', () => {
    const asked = 'https://eurasiaartplatform.com/set-password';
    expect(rewrittenRedirect(link(asked), asked)).toBeNull();
  });

  it('reports the destination Supabase substituted', () => {
    // The live failure: the domain was missing from the Redirect Allow List, so
    // Supabase quietly swapped in the Site URL and dropped /set-password.
    const got = rewrittenRedirect(
      link('https://classy-lokum-ef3d01.netlify.app'),
      'https://eurasiaartplatform.com/set-password',
    );
    expect(got).toBe('https://classy-lokum-ef3d01.netlify.app');
  });

  it('counts a dropped path as a rewrite, same host or not', () => {
    expect(rewrittenRedirect(link('https://eap.art'), 'https://eap.art/set-password'))
      .toBe('https://eap.art');
  });

  it('claims nothing when there is no link, no ask, or no redirect in it', () => {
    expect(rewrittenRedirect(null, 'https://eap.art/set-password')).toBeNull();
    expect(rewrittenRedirect(link('https://eap.art'), '')).toBeNull();
    expect(rewrittenRedirect('https://p.supabase.co/auth/v1/verify?token=t', 'https://eap.art')).toBeNull();
    expect(rewrittenRedirect('not a url', 'https://eap.art')).toBeNull();
  });
});
