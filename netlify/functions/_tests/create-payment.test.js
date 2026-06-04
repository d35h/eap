import { describe, it, expect, vi } from 'vitest';
import { handlePayment } from '../create-payment.js';

function adminStub(app) {
  const update = vi.fn().mockResolvedValue({ error: null });
  const client = {
    from: () => ({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: app, error: null }) }) }),
      update: () => ({ eq: () => update() }),
    }),
  };
  return { client, update };
}

describe('handlePayment', () => {
  it('creates a session and returns a redirectUrl', async () => {
    const { client } = adminStub({ id: 'app-1', tier: 2, payment_status: 'pending' });
    const res = await handlePayment(
      { admin: client, env: { PUBLIC_SITE_URL: 'https://site' } },
      { applicationId: 'app-1', channel: 'mock' }
    );
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.redirectUrl).toContain('/mock-pay');
  });

  it('400s when applicationId is missing', async () => {
    const { client } = adminStub(null);
    const res = await handlePayment({ admin: client, env: {} }, { channel: 'mock' });
    expect(res.statusCode).toBe(400);
  });

  it('400s on unknown channel', async () => {
    const { client } = adminStub({ id: 'app-1', tier: 1 });
    const res = await handlePayment({ admin: client, env: {} }, { applicationId: 'app-1', channel: 'nope' });
    expect(res.statusCode).toBe(400);
  });
});
