import { describe, it, expect, vi } from 'vitest';
import { handleWebhook } from './payment-webhook.js';

function adminStub() {
  const update = vi.fn(() => ({ eq: () => Promise.resolve({ error: null }) }));
  return { client: { from: () => ({ update }) }, update };
}

describe('handleWebhook', () => {
  it('marks the application paid on a paid webhook', async () => {
    const { client, update } = adminStub();
    const res = await handleWebhook(
      { admin: client, channel: 'mock' },
      { headers: {}, body: JSON.stringify({ ref: 'mock_app-1', status: 'paid' }) }
    );
    expect(res.statusCode).toBe(200);
    expect(update).toHaveBeenCalledWith({ payment_status: 'paid' });
  });

  it('does not mark paid when not paid', async () => {
    const { client, update } = adminStub();
    await handleWebhook(
      { admin: client, channel: 'mock' },
      { headers: {}, body: JSON.stringify({ ref: 'x', status: 'failed' }) }
    );
    expect(update).not.toHaveBeenCalled();
  });
});
