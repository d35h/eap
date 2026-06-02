# EAP Backend — Phase 2: Payments (sandbox, mock-first) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace the simulated payment with a real session-based flow: the client asks a server function to create a payment session for the chosen channel, redirects to the gateway, and a webhook marks the application `paid`. Ships with a working **mock provider** so the flow is demoable end-to-end without merchant credentials; real **bePaid** and **Georgian** adapters are scaffolded and activate via env vars.

**Architecture:** Netlify Functions hold the server logic + secret keys. A provider registry maps a channel id → adapter (`mock`, `bepaid`, `georgia`); each adapter implements `createSession()` and `verifyWebhook()`. Amount is always derived **server-side** from the application's tier. The client gets two channel buttons (BYN / international) showing dual price, calls `create-payment`, and redirects.

**Tech Stack:** Netlify Functions (Node), `@supabase/supabase-js` (service-role, server-side), Vitest. Frontend: React.

**Spec:** `docs/superpowers/specs/2026-06-02-eap-backend-design.md` (Phase 2).

**Prerequisites / env (server-side, set in Netlify — NEVER `VITE_`):**
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (the `sb_secret_…` key — server only).
- `PAYMENTS_PROVIDER` = `mock` | `bepaid` | `georgia` (which channel(s) are active).
- Later: `BEPAID_SHOP_ID`/`BEPAID_SECRET`, `GEORGIA_*` — adapters read these; absent ⇒ that channel is hidden.
- `PUBLIC_SITE_URL` for building return URLs.

**Note on testability:** All adapter logic + amount calc + webhook verification are pure functions, unit-tested with Vitest. The Netlify Functions are thin handlers wrapping them. The mock provider lets the whole flow run under `netlify dev` without external services.

---

### Task 1: Netlify configuration + functions scaffold

**Files:**
- Create: `netlify.toml`
- Create: `netlify/functions/_lib/json.js`
- Test: `netlify/functions/_lib/json.test.js`

- [ ] **Step 1: Write the failing test**

`netlify/functions/_lib/json.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { json } from './json.js';

describe('json helper', () => {
  it('builds a JSON response with status and headers', () => {
    const res = json(201, { ok: true });
    expect(res.statusCode).toBe(201);
    expect(res.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(res.body)).toEqual({ ok: true });
  });
  it('defaults status to 200', () => {
    expect(json(undefined, {}).statusCode).toBe(200);
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npm test -- json` → FAIL (module not found).

- [ ] **Step 3: Implement**

`netlify/functions/_lib/json.js`:

```js
export function json(statusCode, payload) {
  return {
    statusCode: statusCode || 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  };
}
```

`netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"

[functions]
  node_bundler = "esbuild"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

- [ ] **Step 4: Run test, verify pass**

Run: `npm test -- json` → PASS.

- [ ] **Step 5: Commit**

```bash
git add netlify.toml netlify/functions/_lib/json.js netlify/functions/_lib/json.test.js
git commit -m "feat: netlify functions scaffold + json helper"
```

---

### Task 2: Pricing module (single source of truth, server-side)

**Files:**
- Create: `netlify/functions/_lib/pricing.js`
- Test: `netlify/functions/_lib/pricing.test.js`

- [ ] **Step 1: Failing test**

`netlify/functions/_lib/pricing.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { amountFor } from './pricing.js';

describe('amountFor', () => {
  it('maps tier to BYN minor units and EUR', () => {
    expect(amountFor(1)).toEqual({ byn: 100, eur: 30 });
    expect(amountFor(2)).toEqual({ byn: 150, eur: 45 });
    expect(amountFor(3)).toEqual({ byn: 170, eur: 50 });
  });
  it('clamps out-of-range tiers to 1..3', () => {
    expect(amountFor(0)).toEqual({ byn: 100, eur: 30 });
    expect(amountFor(9)).toEqual({ byn: 170, eur: 50 });
  });
});
```

- [ ] **Step 2: Run, verify fail.** `npm test -- pricing` → FAIL.

- [ ] **Step 3: Implement**

`netlify/functions/_lib/pricing.js`:

```js
// Single source of truth for tier pricing. EUR amounts are the Georgian-channel
// equivalents of the BYN tiers (confirm the rate with the acquirer).
const TABLE = {
  1: { byn: 100, eur: 30 },
  2: { byn: 150, eur: 45 },
  3: { byn: 170, eur: 50 },
};

export function amountFor(tier) {
  const t = Math.min(Math.max(Number(tier) || 1, 1), 3);
  return TABLE[t];
}
```

- [ ] **Step 4: Run, verify pass.** `npm test -- pricing` → PASS.

- [ ] **Step 5: Commit**

```bash
git add netlify/functions/_lib/pricing.js netlify/functions/_lib/pricing.test.js
git commit -m "feat: server-side pricing table"
```

---

### Task 3: Mock payment adapter

**Files:**
- Create: `netlify/functions/_lib/providers/mock.js`
- Test: `netlify/functions/_lib/providers/mock.test.js`

Adapter interface (all providers implement it):
`createSession({ applicationId, channel, amount, returnUrl }) -> { redirectUrl, ref }`
`verifyWebhook({ headers, body }) -> { ref, paid: boolean }`

- [ ] **Step 1: Failing test**

`netlify/functions/_lib/providers/mock.test.js`:

```js
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
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement**

`netlify/functions/_lib/providers/mock.js`:

```js
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
```

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: Commit**

```bash
git add netlify/functions/_lib/providers/mock.js netlify/functions/_lib/providers/mock.test.js
git commit -m "feat: mock payment provider adapter"
```

---

### Task 4: Provider registry + real adapter stubs

**Files:**
- Create: `netlify/functions/_lib/providers/index.js`
- Create: `netlify/functions/_lib/providers/bepaid.js`
- Create: `netlify/functions/_lib/providers/georgia.js`
- Test: `netlify/functions/_lib/providers/index.test.js`

- [ ] **Step 1: Failing test**

`netlify/functions/_lib/providers/index.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { getProvider, activeChannels } from './index.js';

describe('provider registry', () => {
  it('returns the mock provider', () => {
    expect(getProvider('mock').id).toBe('mock');
  });
  it('throws on unknown provider', () => {
    expect(() => getProvider('nope')).toThrow();
  });
  it('lists active channels from env', () => {
    expect(activeChannels({ PAYMENTS_PROVIDER: 'mock' })).toEqual(['mock']);
    expect(activeChannels({ BEPAID_SHOP_ID: 'x', GEORGIA_CLIENT_ID: 'y' }).sort()).toEqual(['bepaid', 'georgia']);
  });
});
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement**

`netlify/functions/_lib/providers/bepaid.js`:

```js
// bePaid adapter (Belarusian channel, BYN). Scaffold against docs.bepaid.by.
// Requires BEPAID_SHOP_ID + BEPAID_SECRET to be active. Not yet wired to the
// live API — createSession throws until implemented with real credentials.
export const bepaid = {
  id: 'bepaid',
  createSession() {
    throw new Error('bePaid adapter not implemented — add BEPAID_* credentials and the token request');
  },
  verifyWebhook() {
    throw new Error('bePaid webhook verification not implemented');
  },
};
```

`netlify/functions/_lib/providers/georgia.js`:

```js
// Georgian acquiring adapter (TBC E-Commerce / BOG iPay), EUR. Scaffold.
// Requires GEORGIA_CLIENT_ID/secret. Not yet wired to the live API.
export const georgia = {
  id: 'georgia',
  createSession() {
    throw new Error('Georgia adapter not implemented — add GEORGIA_* credentials and the session request');
  },
  verifyWebhook() {
    throw new Error('Georgia webhook verification not implemented');
  },
};
```

`netlify/functions/_lib/providers/index.js`:

```js
import { mock } from './mock.js';
import { bepaid } from './bepaid.js';
import { georgia } from './georgia.js';

const REGISTRY = { mock, bepaid, georgia };

export function getProvider(id) {
  const p = REGISTRY[id];
  if (!p) throw new Error(`Unknown payment provider: ${id}`);
  return p;
}

// Which channels are usable, based on configured env.
export function activeChannels(env) {
  const channels = [];
  if (env.PAYMENTS_PROVIDER === 'mock') channels.push('mock');
  if (env.BEPAID_SHOP_ID) channels.push('bepaid');
  if (env.GEORGIA_CLIENT_ID) channels.push('georgia');
  return channels;
}
```

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: Commit**

```bash
git add netlify/functions/_lib/providers/index.js netlify/functions/_lib/providers/bepaid.js netlify/functions/_lib/providers/georgia.js netlify/functions/_lib/providers/index.test.js
git commit -m "feat: provider registry + bePaid/Georgia stubs"
```

---

### Task 5: `create-payment` function

**Files:**
- Create: `netlify/functions/create-payment.js`
- Create: `netlify/functions/_lib/supabaseAdmin.js`
- Test: `netlify/functions/create-payment.test.js`

The handler: reads `{ applicationId, channel }`, loads the application (service-role) to get its tier, derives the amount via `amountFor`, calls the provider's `createSession`, persists `payment_provider`/`payment_ref` on the row, returns `{ redirectUrl }`.

- [ ] **Step 1: Failing test** (inject a fake admin client + provider)

`netlify/functions/create-payment.test.js`:

```js
import { describe, it, expect, vi } from 'vitest';
import { handlePayment } from './create-payment.js';

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
});
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement**

`netlify/functions/_lib/supabaseAdmin.js`:

```js
import { createClient } from '@supabase/supabase-js';

// Server-side client using the SECRET service-role key. Never import in client code.
export function makeAdmin(env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}
```

`netlify/functions/create-payment.js`:

```js
import { makeAdmin } from './_lib/supabaseAdmin.js';
import { getProvider } from './_lib/providers/index.js';
import { amountFor } from './_lib/pricing.js';
import { json } from './_lib/json.js';

// Pure core (testable): deps injected.
export async function handlePayment({ admin, env }, input) {
  const { applicationId, channel } = input || {};
  if (!applicationId || !channel) return json(400, { error: 'applicationId and channel required' });

  const { data: app, error } = await admin
    .from('applications').select('*').eq('id', applicationId).single();
  if (error || !app) return json(404, { error: 'application not found' });

  const provider = getProvider(channel);
  const amount = amountFor(app.tier);
  const returnUrl = `${env.PUBLIC_SITE_URL || ''}/apply`;
  const session = provider.createSession({ applicationId, channel, amount, returnUrl });

  await admin.from('applications')
    .update({ payment_provider: channel, payment_ref: session.ref })
    .eq('id', applicationId);

  return json(200, { redirectUrl: session.redirectUrl });
}

// Netlify entrypoint.
export async function handler(event) {
  const env = process.env;
  const admin = makeAdmin(env);
  return handlePayment({ admin, env }, JSON.parse(event.body || '{}'));
}
```

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: Commit**

```bash
git add netlify/functions/create-payment.js netlify/functions/_lib/supabaseAdmin.js netlify/functions/create-payment.test.js
git commit -m "feat: create-payment function (server-side amount + session)"
```

---

### Task 6: `payment-webhook` function

**Files:**
- Create: `netlify/functions/payment-webhook.js`
- Test: `netlify/functions/payment-webhook.test.js`

Handler: verifies the webhook with the right provider, and on `paid` sets `payment_status='paid'`. (Account creation is added in Phase 3 — leave a clearly-marked hook point.)

- [ ] **Step 1: Failing test**

`netlify/functions/payment-webhook.test.js`:

```js
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
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement**

`netlify/functions/payment-webhook.js`:

```js
import { makeAdmin } from './_lib/supabaseAdmin.js';
import { getProvider } from './_lib/providers/index.js';
import { json } from './_lib/json.js';

export async function handleWebhook({ admin, channel }, req) {
  const provider = getProvider(channel);
  const { ref, paid } = provider.verifyWebhook(req);
  if (!paid) return json(200, { ignored: true });

  const { error } = await admin
    .from('applications')
    .update({ payment_status: 'paid' })
    .eq('payment_ref', ref);
  if (error) return json(500, { error: error.message });

  // PHASE 3 HOOK: create the Supabase auth user for this application's email
  // and trigger the confirmation email. Added in the accounts plan.

  return json(200, { ok: true });
}

export async function handler(event) {
  const env = process.env;
  const channel = (event.queryStringParameters && event.queryStringParameters.channel) || env.PAYMENTS_PROVIDER || 'mock';
  return handleWebhook({ admin: makeAdmin(env), channel }, { headers: event.headers, body: event.body });
}
```

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: Commit**

```bash
git add netlify/functions/payment-webhook.js netlify/functions/payment-webhook.test.js
git commit -m "feat: payment-webhook marks application paid"
```

---

### Task 7: Frontend — channel selection + redirect (replaces simulated pay)

**Files:**
- Modify: `src/lib/payments.js` (Create)
- Modify: `src/pages/Apply.jsx` (Step4 payment UI + submitFinal)
- Create: `src/pages/MockPay.jsx`
- Modify: `src/App.jsx` (add `/mock-pay` route)
- i18n: add channel labels (RU/EN/KZ/ZH) in `src/i18n.js`

- [ ] **Step 1: Payments client helper**

`src/lib/payments.js`:

```js
// Calls the create-payment function and returns the gateway redirect URL.
export async function startPayment(applicationId, channel) {
  const res = await fetch('/.netlify/functions/create-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ applicationId, channel }),
  });
  if (!res.ok) throw new Error('Payment init failed');
  const { redirectUrl } = await res.json();
  return redirectUrl;
}
```

- [ ] **Step 2: i18n channel labels** — add to each language's `apply` block:

```js
      payByn: 'Карта РБ / РФ · ЕРИП — оплата в BYN',
      payIntl: 'Visa / Mastercard / UnionPay — оплата в €',
```
(EN: `'BY / RU card · ERIP — pay in BYN'` / `'Visa / Mastercard / UnionPay — pay in €'`; KZ and ZH analogous — provide natural translations.)

- [ ] **Step 3: `submitFinal` — persist then redirect to payment**

In `Apply.jsx`, change `submitFinal` so that when Supabase is configured it: creates the application + uploads files (already does), then instead of showing success immediately, calls `startPayment(application.id, channel)` and `window.location = redirectUrl`. `channel` comes from the selected payment option. Keep the simulated fallback when Supabase is not configured.

```js
import { startPayment } from '../lib/payments.js';
// ... in submitFinal, after uploadWorkFiles:
const redirectUrl = await startPayment(application.id, form.paymentChannel || 'mock');
window.location.assign(redirectUrl);
return; // success screen shows after the gateway returns / webhook confirms
```

- [ ] **Step 4: Channel buttons in Step4** — replace the old `pay-method` list with two buttons bound to `form.paymentChannel` ('byn' | 'intl' → mapped to provider ids), showing dual price via `feeFor`. Show only channels the build supports (mock in dev).

- [ ] **Step 5: `MockPay.jsx` + route** — a dev-only page that reads `?ref=&return=`, shows "Mock gateway — confirm payment", and on click POSTs `{ref, status:'paid'}` to `/.netlify/functions/payment-webhook?channel=mock`, then redirects to `return + '?status=success'`.

- [ ] **Step 6: Verify** — `npm run build` succeeds; `npm test` passes. Manual (with `netlify dev` + Supabase env): submit → mock-pay → confirm → row becomes `paid`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/payments.js src/pages/Apply.jsx src/pages/MockPay.jsx src/App.jsx src/i18n.js
git commit -m "feat: payment channel selection + mock gateway flow"
```

---

## Self-Review

**Spec coverage (Phase 2):** create-payment (T5), webhook→paid (T6), provider abstraction + adapters (T3–4), server-side amount (T2,T5), dual-channel UI + dual price (T7), Netlify Functions + secret handling (T1,T5). Account-creation hook explicitly deferred to Phase 3 (marked in T6). ✓

**Placeholder scan:** bePaid/Georgia adapters intentionally `throw` until real credentials — this is a documented stub, not a TODO; every other step has full code. T7 steps 3–5 describe UI edits with the key code shown; the implementer follows existing `Apply.jsx`/`MockPay` patterns.

**Type consistency:** adapter interface (`createSession`/`verifyWebhook`), `amountFor(tier) → {byn,eur}`, `getProvider(id)`, `handlePayment({admin,env}, input)`, `handleWebhook({admin,channel}, req)`, `startPayment(applicationId, channel)` — consistent across tasks.

**Gated on credentials (runtime only, not the build):** live bePaid/Georgian charges (their `*_` env + adapter bodies), and Supabase service-role env on Netlify. Mock provider covers end-to-end demo.
