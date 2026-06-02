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
});
