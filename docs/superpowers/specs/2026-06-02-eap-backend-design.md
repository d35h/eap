# EAP Backend — Payments, Application Storage & Accounts

**Date:** 2026-06-02
**Status:** Approved (direction) — pending spec review
**Owner:** Dan Zaru

## 1. Goal

Turn the EAP open-call form from a front-end-only simulation into a real
end-to-end pipeline:

1. An applicant submits the multi-step application (contacts → works → payment).
2. They pay a tiered fee (1 work = 100 BYN, 2 = 150 BYN, 3 = 170 BYN).
3. On successful payment the application + work files are stored, an account is
   created for their email, and a confirmation/set-password email is sent.
4. The applicant confirms, sets a password, logs in, and sees their
   application and its status in a personal cabinet («Кабинет художника»).

## 2. Context & constraints

- Current app: React + Vite SPA, deployed on **Netlify**, no backend.
- Audience/payers: Belarus, Russia, Kazakhstan, China + diaspora.
- **Sanctions reality:** Russian/Belarusian Visa/Mastercard are cut off from
  international rails; Mir/ERIP need a Belarusian merchant; Stripe/PayPal don't
  operate in these markets. (See investigation notes in chat / sources.)
- **Legal entities (business prerequisite, in progress):**
  - Belarusian channel needs a **Belarusian ИП/ООО** (self-employed/"ремесленник"
    are *not* eligible — wrong activity type) + bePaid (or WebPay).
  - International channel (Kazakhstan, China via UnionPay, diaspora) needs
    **Georgian acquiring** (TBC / Bank of Georgia), or can be deferred.
- **Currency:** Belarusian channel settles **BYN**; Georgian channel settles
  EUR/USD. Tiers shown as BYN with an EUR equivalent on the international channel.
- Payment credentials (merchant accounts/API keys) are **not yet available**, so
  everything is built **sandbox/test-ready** and flips to live via env vars.

## 3. Decisions (locked in brainstorming)

| Decision | Choice |
|---|---|
| Account model | **Pay first → account auto-created from the application email → confirm/set-password email → login** |
| Backend platform | **Supabase** (Auth + Postgres + Storage) |
| Server logic | **Netlify Functions** (payment session creation + webhooks) |
| Payment channels | **bePaid (BYN)** + **Georgian acquiring (EUR)**, selectable; each can be enabled independently |
| Rail/price UX | Two explicit options on the payment step, dual price («150 BYN ≈ €X») |
| After payment | Store application in Supabase DB + files in Supabase Storage + email notify org |
| Auth emails | Supabase built-in initially; brand with eap.art domain later |

## 4. Architecture

```
React SPA (Netlify CDN)
  ├─ Supabase JS client  → Auth (confirm/login), read own application (RLS)
  ├─ /apply  → create application (pending) + upload files → call create-payment
  ├─ /login, /set-password, /account (cabinet)
  └─ redirect to payment gateway hosted page

Netlify Functions (server, secret keys)
  ├─ create-payment   → builds a session with bePaid OR Georgian acquirer
  ├─ payment-webhook  → verifies signature, marks paid, creates auth user,
  │                     triggers confirmation email, notifies org
  └─ (uses Supabase service-role key)

Supabase
  ├─ Auth (email confirm + password)
  ├─ Postgres: applications
  └─ Storage: works/ bucket
```

### Payment provider abstraction
A single internal interface (`createSession(provider, {tier, amount, currency,
applicationId, returnUrl})` and `verifyWebhook(provider, req)`) with one adapter
per provider (`bepaid`, `georgia`). Adding/swapping a provider is isolated to its
adapter. Providers are toggled by presence of their env keys; the UI only shows a
channel whose provider is configured.

## 5. Data model

**Table `applications`**
- `id` uuid pk
- `email` text (lowercased)
- `first_name`, `last_name`, `country`, `city`, `website`, `instagram` text
- `works` jsonb — `[{ title, year, media, size, desc, file_path }]`
- `tier` int (1–3), `amount` int, `currency` text ('BYN'|'EUR')
- `payment_status` text ('pending'|'paid'|'failed')
- `payment_provider` text, `payment_ref` text
- `user_id` uuid null (linked once the auth account exists)
- `created_at` timestamptz default now()

**Storage bucket `works`** — private; files at `applications/{id}/work{n}.{ext}`.

**Row Level Security**
- Inserts of `pending` applications allowed from the anon client (so the form can
  create the row before payment), with no read-back of others' rows.
- Reads restricted to `auth.uid() = user_id` (a logged-in applicant sees only
  their own application). Service-role (functions) bypasses RLS for the webhook.
- Storage: write via signed upload from the client for the row just created;
  read only via short-lived signed URLs issued to the owner / org.

## 6. Flows

**A. Submit + pay**
1. Client validates the form, creates an `applications` row (`pending`), uploads
   each work file to Storage (`applications/{id}/...`), stores `file_path` in
   `works`.
2. Client calls `create-payment` with `{applicationId, provider}`.
3. Function computes amount from tier server-side (never trust client amount),
   creates a gateway session, returns the redirect URL.
4. Client redirects to the gateway's hosted payment page.

**B. Payment result**
1. Gateway → `payment-webhook` (server-to-server). Function verifies signature,
   matches `payment_ref`, sets `payment_status='paid'`.
2. Function creates a Supabase auth user for `email` (if absent), links
   `user_id`, and triggers Supabase's confirmation/set-password email.
3. Function emails the org a notification with application summary + signed file
   links.
4. Gateway also redirects the browser back to `/apply?status=success|failed`
   (display only; source of truth is the webhook).

**C. Confirm → login → cabinet**
1. User clicks the email link → sets a password (Supabase) → confirmed.
2. `/login` (email + password) → `/account`.
3. `/account` shows the user's application(s): tier, works, payment status.
   (Results/feedback are future scope.)

## 7. Build order (phases)

Tightly coupled, so delivered in increments — each independently testable:

- **Phase 1 — Persistence:** Supabase project, `applications` table + RLS,
  Storage bucket, client writes the row + uploads files on submit. (Payment still
  simulated; row marked paid by the existing fake success for now.)
- **Phase 2 — Payments (sandbox):** Netlify Functions `create-payment` +
  `payment-webhook`, provider adapters (bePaid + Georgia) in **test mode**, dual
  channel UI + dual price, server-side amount calc, webhook verification.
- **Phase 3 — Accounts:** auth user creation on paid webhook, confirmation/
  set-password email, `/login`, `/set-password`, `/account` cabinet, RLS-scoped
  reads.

Going live = drop real bePaid/Georgian credentials into Netlify env; no code
change.

## 8. Security

- Secret keys (gateway secrets, Supabase service-role) only in Netlify env / used
  by Functions; never shipped to the browser.
- Amount/tier computed server-side; webhook is the only source that marks `paid`.
- Webhook signature verification per provider.
- RLS so applicants can read only their own row; files via short-lived signed URLs.
- Unpaid applications + their files are abandoned data — a periodic cleanup
  (cron/Function) deletes `pending` rows older than N days. (Phase 2+.)

## 9. Prerequisites (provided by owner)

- A **Supabase project** → `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY` (last one as a Netlify secret).
- Later, for live payments: bePaid credentials (+ Belarusian ИП/ООО) and/or
  Georgian acquirer credentials.
- Org notification email address.

## 10. Out of scope (YAGNI for now)

- Results/feedback delivery and scoring in the cabinet.
- Editing a submitted application.
- Admin dashboard / jury review tooling.
- Refunds UI, invoices, multi-cycle handling.
- Crypto channel (kept as a documented fallback option, not built).

## 11. Open questions / assumptions

- Georgian channel may be deferred to a later phase if only the Belarusian
  entity exists first (Variant A vs B); the adapter abstraction supports either.
- Exact EUR amounts per tier for the Georgian channel to be set in config
  (e.g. 100/150/170 BYN ≈ €30/€45/€50 — confirm rate).
- One application per account assumed for MVP (re-applying handled later).
