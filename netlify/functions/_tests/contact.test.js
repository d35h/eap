import { describe, it, expect, vi } from 'vitest';
import { handleContact } from '../contact.js';

const ok = () => ({ ok: true, text: async () => '' });
const deps = (send, env = { RESEND_API_KEY: 'k' }) => ({ env, send });
const valid = { name: 'Maria', email: 'maria@example.com', subject: 'Open call', message: 'Hello' };

describe('handleContact', () => {
  it('sends the message and reports success', async () => {
    const send = vi.fn().mockResolvedValue(ok());
    const res = await handleContact(deps(send), valid);
    expect(res.statusCode).toBe(200);
    expect(send).toHaveBeenCalledTimes(1);
    const body = JSON.parse(send.mock.calls[0][1].body);
    expect(body.to).toEqual(['info@eap.art']);
    // Replying to the notification must reach the sender, not the platform.
    expect(body.reply_to).toBe('maria@example.com');
    expect(body.text).toContain('Hello');
  });

  it('rejects a missing message', async () => {
    const send = vi.fn();
    const res = await handleContact(deps(send), { ...valid, message: '   ' });
    expect(res.statusCode).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });

  it('rejects an address that is not an address', async () => {
    const send = vi.fn();
    const res = await handleContact(deps(send), { ...valid, email: 'maria@' });
    expect(res.statusCode).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });

  it('refuses to claim success when no transport is configured', async () => {
    // The whole point of this function: never report a delivery it cannot make.
    const send = vi.fn();
    const res = await handleContact(deps(send, {}), valid);
    expect(res.statusCode).toBe(503);
    expect(JSON.parse(res.body).code).toBe('no_transport');
    expect(send).not.toHaveBeenCalled();
  });

  it('reports failure when the provider rejects the call', async () => {
    const send = vi.fn().mockResolvedValue({ ok: false, status: 422, text: async () => 'bad domain' });
    const res = await handleContact(deps(send), valid);
    expect(res.statusCode).toBe(502);
  });

  it('truncates hostile input rather than forwarding it whole', async () => {
    const send = vi.fn().mockResolvedValue(ok());
    await handleContact(deps(send), { ...valid, message: 'x'.repeat(20000) });
    const body = JSON.parse(send.mock.calls[0][1].body);
    expect(body.text.length).toBeLessThan(5200);
  });
});
