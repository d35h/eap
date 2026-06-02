import { useState } from 'react';

export default function MockPay() {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref');
  const ret = params.get('return') || '/';
  const [busy, setBusy] = useState(false);

  const pay = async () => {
    setBusy(true);
    await fetch('/.netlify/functions/payment-webhook?channel=mock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref, status: 'paid' }),
    });
    const url = new URL(ret, window.location.origin);
    url.searchParams.set('status', 'success');
    window.location.assign(url.toString());
  };

  return (
    <div className="apply-page">
      <div className="container">
        <div className="success-screen">
          <h2>Mock gateway</h2>
          <p>Ref: {ref}</p>
          <button className="btn-ink" onClick={pay} disabled={busy}>
            {busy ? 'Processing…' : 'Confirm payment (test)'}
          </button>
        </div>
      </div>
    </div>
  );
}
