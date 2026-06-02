// Mock provider: lets the full flow run without a real gateway.
// The "redirect" goes to an in-app /mock-pay page that posts the webhook.
export const mock = {
  id: 'mock',
  createSession({ applicationId, returnUrl }) {
    const ref = `mock_${applicationId}`;
    const url = new URL('/mock-pay', returnUrl);
    url.searchParams.set('ref', ref);
    url.searchParams.set('return', returnUrl);
    return { ref, redirectUrl: url.toString() };
  },
  verifyWebhook({ body }) {
    const data = JSON.parse(body || '{}');
    return { ref: data.ref, paid: data.status === 'paid' };
  },
};
