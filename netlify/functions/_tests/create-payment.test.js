import { describe, it, expect, vi } from 'vitest';
import { handlePayment } from '../create-payment.js';

// `files` are the object names present under applications/<id> in the works
// bucket, i.e. what the upload step would have left behind.
function adminStub(app, files = []) {
  const update = vi.fn().mockResolvedValue({ error: null });
  const client = {
    from: () => ({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: app, error: null }) }) }),
      update: () => ({ eq: () => update() }),
    }),
    storage: {
      from: () => ({
        list: () => Promise.resolve({ data: files.map((name) => ({ name })) }),
      }),
    },
  };
  return { client, update };
}

// A fully-uploaded application of n works - the state the client reaches
// before it is allowed to start payment.
const worksFor = (n) => Array.from({ length: n }, (_, i) => ({ title: `Work ${i + 1}` }));
const filesFor = (n) => Array.from({ length: n }, (_, i) => `work${i + 1}.jpg`);

describe('handlePayment', () => {
  it('creates a session and returns a redirectUrl', async () => {
    const { client } = adminStub(
      { id: 'app-1', tier: 2, payment_status: 'pending', works: worksFor(2) },
      filesFor(2)
    );
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
    const { client } = adminStub({ id: 'app-1', tier: 1, works: worksFor(1) }, filesFor(1));
    const res = await handlePayment({ admin: client, env: {} }, { applicationId: 'app-1', channel: 'nope' });
    expect(res.statusCode).toBe(400);
    // Assert the reason too: with an unuploaded fixture this test passed on the
    // missing-files guard instead, never reaching the channel lookup.
    expect(JSON.parse(res.body).error).toBe('unknown channel');
  });

  it('400s when a work has no uploaded file', async () => {
    const { client, update } = adminStub(
      { id: 'app-1', tier: 2, works: worksFor(2) },
      filesFor(1) // work2 never uploaded
    );
    const res = await handlePayment({ admin: client, env: {} }, { applicationId: 'app-1', channel: 'mock' });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).code).toBe('missing_files');
    expect(update).not.toHaveBeenCalled();
  });

  it('400s when the application has no works at all', async () => {
    const { client } = adminStub({ id: 'app-1', tier: 1, works: [] });
    const res = await handlePayment({ admin: client, env: {} }, { applicationId: 'app-1', channel: 'mock' });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).code).toBe('missing_files');
  });
});
