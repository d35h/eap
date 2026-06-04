import { describe, it, expect, vi } from 'vitest';
import { handleWebhook } from '../payment-webhook.js';

function adminStub() {
  // select chain: .select('email').eq('payment_ref', ref).single() => { data: { email: 'a@b.com' } }
  const single = vi.fn().mockResolvedValue({ data: { email: 'a@b.com' } });
  const selectEq = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq: selectEq }));

  // invite chain for createAccountForApplication
  const invite = vi.fn().mockResolvedValue({ data: { user: { id: 'u-1' } }, error: null });
  const updateEq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn(() => ({ eq: () => Promise.resolve({ error: null }) }));

  const client = {
    auth: { admin: { inviteUserByEmail: invite } },
    from: vi.fn((table) => ({ update, select })),
  };
  return { client, update };
}

describe('handleWebhook', () => {
  it('marks the application paid on a paid webhook', async () => {
    const { client, update } = adminStub();
    const res = await handleWebhook(
      { admin: client, channel: 'mock', env: {} },
      { headers: {}, body: JSON.stringify({ ref: 'mock_app-1', status: 'paid' }) }
    );
    expect(res.statusCode).toBe(200);
    expect(update).toHaveBeenCalledWith({ payment_status: 'paid' });
  });

  it('does not mark paid when not paid', async () => {
    const { client, update } = adminStub();
    await handleWebhook(
      { admin: client, channel: 'mock', env: {} },
      { headers: {}, body: JSON.stringify({ ref: 'x', status: 'failed' }) }
    );
    expect(update).not.toHaveBeenCalled();
  });
});
