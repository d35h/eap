import { describe, it, expect } from 'vitest';
import { mock } from './mock.js';

describe('mock provider', () => {
  it('creates a session that redirects to the mock pay page with a ref', () => {
    const s = mock.createSession({
      applicationId: 'app-1', channel: 'byn', amount: { byn: 100, eur: 30 },
      returnUrl: 'https://site/apply',
    });
    expect(s.ref).toBe('mock_app-1');
    expect(s.redirectUrl).toContain('/mock-pay');
    expect(s.redirectUrl).toContain('ref=mock_app-1');
  });

  it('verifies a webhook body and reports paid', () => {
    const r = mock.verifyWebhook({ headers: {}, body: JSON.stringify({ ref: 'mock_app-1', status: 'paid' }) });
    expect(r).toEqual({ ref: 'mock_app-1', paid: true });
  });

  it('reports not-paid for other statuses', () => {
    const r = mock.verifyWebhook({ headers: {}, body: JSON.stringify({ ref: 'x', status: 'failed' }) });
    expect(r).toEqual({ ref: 'x', paid: false });
  });
});
