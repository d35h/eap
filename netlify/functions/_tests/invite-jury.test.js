import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleInviteJury } from '../invite-jury.js';

const LINK = 'https://p.supabase.co/auth/v1/verify?token=t&type=invite&redirect_to=https://eap.art/set-password';

const ok = () => ({ ok: true, text: async () => '' });
const rejected = (status, body) => ({ ok: false, status, text: async () => body });

function adminStub({ role = 'admin', gen, link = LINK } = {}) {
  const updateUserById = vi.fn().mockResolvedValue({});
  const generateLink = vi.fn().mockResolvedValue(
    gen ?? { data: { user: { id: 'u1' }, properties: { action_link: link } }, error: null }
  );
  return {
    updateUserById,
    generateLink,
    auth: {
      getUser: async () => ({ data: { user: { app_metadata: { role } } }, error: null }),
      admin: { generateLink, updateUserById },
    },
  };
}

const env = { RESEND_API_KEY: 'k', PUBLIC_SITE_URL: 'https://eap.art' };
const input = { token: 't', email: 'Juror@Example.com', name: 'Мария' };

let errSpy;
beforeEach(() => { errSpy = vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => { errSpy.mockRestore(); });

describe('handleInviteJury', () => {
  it('invites and reports success when the letter actually goes out', async () => {
    const admin = adminStub();
    const send = vi.fn().mockResolvedValue(ok());
    const res = await handleInviteJury({ admin, env, send }, input);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).status).toBe('invited');
    expect(send).toHaveBeenCalledTimes(1);
    // Addressed to the invitee, lowercased.
    expect(JSON.parse(send.mock.calls[0][1].body).to).toEqual(['juror@example.com']);
  });

  it('stamps the juror role and the admin-assigned name', async () => {
    const admin = adminStub();
    await handleInviteJury({ admin, env, send: vi.fn().mockResolvedValue(ok()) }, input);
    expect(admin.updateUserById).toHaveBeenCalledWith('u1', {
      app_metadata: { role: 'juror', name: 'Мария' },
    });
  });

  it('refuses to claim an invitation the provider rejected', async () => {
    // The whole point. This reported "Приглашение отправлено." while Resend was
    // refusing every send, so the admin had no way to see why nobody arrived.
    const admin = adminStub();
    const send = vi.fn().mockResolvedValue(
      rejected(403, '{"statusCode":403,"message":"The domain is not verified.","name":"validation_error"}')
    );
    const res = await handleInviteJury({ admin, env, send }, input);
    expect(res.statusCode).toBe(502);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('undelivered');
    expect(body.provider).toBe(403);
    // The provider's own slug: without it the failure is unactionable.
    expect(body.code).toBe('validation_error');
  });

  it('will not create an account it cannot tell anyone about', async () => {
    const admin = adminStub();
    const send = vi.fn();
    const res = await handleInviteJury({ admin, env: { PUBLIC_SITE_URL: 'https://eap.art' }, send }, input);
    expect(res.statusCode).toBe(503);
    expect(JSON.parse(res.body).code).toBe('no_transport');
    expect(admin.generateLink).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('reports an already-registered address as such', async () => {
    const admin = adminStub({
      gen: { data: null, error: { code: 'email_exists', message: 'A user with this email address has already been registered' } },
    });
    const res = await handleInviteJury({ admin, env, send: vi.fn() }, input);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).status).toBe('exists');
  });

  it('does not pass a backend fault off as an existing user', async () => {
    // Every GoTrue error used to come back as "this email already exists",
    // which sends the admin looking for the wrong problem entirely.
    const admin = adminStub({ gen: { data: null, error: { message: 'database connection failed' } } });
    const res = await handleInviteJury({ admin, env, send: vi.fn() }, input);
    expect(res.statusCode).toBe(502);
    expect(JSON.parse(res.body).status).not.toBe('exists');
  });

  it('says so when Supabase hands back no link at all', async () => {
    const admin = adminStub({ gen: { data: { user: { id: 'u1' }, properties: {} }, error: null } });
    const send = vi.fn();
    const res = await handleInviteJury({ admin, env, send }, input);
    expect(res.statusCode).toBe(502);
    expect(send).not.toHaveBeenCalled();
  });

  it('notes when Supabase redirects the invitation somewhere else', async () => {
    // Not fatal - the letter still sends - but the juror lands short of the
    // password form, and nothing else in the system would ever say so.
    const admin = adminStub({
      link: 'https://p.supabase.co/auth/v1/verify?token=t&type=invite&redirect_to=https://old-host.netlify.app',
    });
    const res = await handleInviteJury({ admin, env, send: vi.fn().mockResolvedValue(ok()) }, input);
    expect(res.statusCode).toBe(200);
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('old-host.netlify.app'));
  });

  it('turns away a caller who is not an admin', async () => {
    const admin = adminStub({ role: 'juror' });
    const send = vi.fn();
    const res = await handleInviteJury({ admin, env, send }, input);
    expect(res.statusCode).toBe(403);
    expect(send).not.toHaveBeenCalled();
  });

  it('rejects an address that is not an address', async () => {
    const admin = adminStub();
    const res = await handleInviteJury({ admin, env, send: vi.fn() }, { ...input, email: 'juror@' });
    expect(res.statusCode).toBe(400);
    expect(admin.generateLink).not.toHaveBeenCalled();
  });
});
