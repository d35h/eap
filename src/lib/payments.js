// Initiates payment via the create-payment function and returns the gateway URL.
// In mock/sandbox mode (VITE_PAYMENTS_MOCK=true) every channel routes to the mock provider.
export async function startPayment(applicationId, channel) {
  const ch = import.meta.env.VITE_PAYMENTS_MOCK === 'true' ? 'mock' : channel;
  const res = await fetch('/.netlify/functions/create-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ applicationId, channel: ch }),
  });
  if (!res.ok) throw new Error('Payment init failed');
  const { redirectUrl } = await res.json();
  return redirectUrl;
}
