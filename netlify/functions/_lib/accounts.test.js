import { describe, it, expect, vi } from 'vitest';
import { createAccountForApplication } from './accounts.js';

function adminStub({ inviteResult }) {
  const invite = vi.fn().mockResolvedValue(inviteResult);
  const eq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn(() => ({ eq }));
  const client = {
    auth: { admin: { inviteUserByEmail: invite } },
    from: vi.fn(() => ({ update })),
  };
  return { client, invite, update, eq };
}

describe('createAccountForApplication', () => {
  it('invites the email and links user_id to the application', async () => {
    const { client, invite, update } = adminStub({
      inviteResult: { data: { user: { id: 'u-1' } }, error: null },
    });
    await createAccountForApplication(
      { admin: client, env: { PUBLIC_SITE_URL: 'https://site' } },
      { email: 'A@B.com', ref: 'mock_app-1' }
    );
    expect(invite).toHaveBeenCalledWith('a@b.com', { redirectTo: 'https://site/set-password' });
    expect(update).toHaveBeenCalledWith({ user_id: 'u-1' });
  });

  it('is a no-op (no throw) when the user already exists', async () => {
    const { client, update } = adminStub({
      inviteResult: { data: null, error: { message: 'User already registered' } },
    });
    await expect(
      createAccountForApplication({ admin: client, env: {} }, { email: 'x@y.com', ref: 'r' })
    ).resolves.toBeUndefined();
    expect(update).not.toHaveBeenCalled();
  });

  it('uses Resend (generateLink + branded send) when RESEND_API_KEY is set', async () => {
    const genLink = vi.fn().mockResolvedValue({
      data: { user: { id: 'u-9' }, properties: { action_link: 'https://link/set' } },
      error: null,
    });
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq }));
    const admin = { auth: { admin: { generateLink: genLink } }, from: vi.fn(() => ({ update })) };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => '' });
    vi.stubGlobal('fetch', fetchMock);

    await createAccountForApplication(
      { admin, env: { RESEND_API_KEY: 're_x', EMAIL_FROM: 'EAP <noreply@eap.art>', PUBLIC_SITE_URL: 'https://site' } },
      { email: 'A@B.com', ref: 'mock_app-9' }
    );

    expect(genLink).toHaveBeenCalledWith({
      type: 'invite', email: 'a@b.com', options: { redirectTo: 'https://site/set-password' },
    });
    expect(fetchMock).toHaveBeenCalledWith('https://api.resend.com/emails', expect.objectContaining({ method: 'POST' }));
    expect(update).toHaveBeenCalledWith({ user_id: 'u-9' });
    vi.unstubAllGlobals();
  });

  it('falls back to a magic login link when the user already exists', async () => {
    const genLink = vi.fn()
      .mockResolvedValueOnce({ data: null, error: { message: 'already registered' } }) // invite fails
      .mockResolvedValueOnce({ data: { user: { id: 'u-2' }, properties: { action_link: 'https://link/magic' } }, error: null }); // magiclink
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq }));
    const admin = { auth: { admin: { generateLink: genLink } }, from: vi.fn(() => ({ update })) };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => '' });
    vi.stubGlobal('fetch', fetchMock);

    await createAccountForApplication(
      { admin, env: { RESEND_API_KEY: 're_x', PUBLIC_SITE_URL: 'https://site' } },
      { email: 'x@y.com', ref: 'r2' }
    );

    expect(genLink).toHaveBeenCalledTimes(2);
    expect(genLink).toHaveBeenNthCalledWith(2, {
      type: 'magiclink', email: 'x@y.com', options: { redirectTo: 'https://site/account' },
    });
    expect(fetchMock).toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({ user_id: 'u-2' });
    vi.unstubAllGlobals();
  });
});
