# EAP Backend — Phase 3: Accounts (auth + cabinet) — Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development. Steps use `- [ ]`.

**Goal:** After a paid application, create a Supabase auth account for the applicant's email and send a confirmation/set-password email; let them log in and see their application(s) in a `/account` cabinet.

**Architecture:** Supabase Auth in the browser via the existing `src/lib/supabase.js` client (publishable key). An `AuthProvider` exposes the session. Pages: `/login`, `/set-password`, `/account`. The paid webhook (server, service-role) creates/invites the auth user and links `applications.user_id`. RLS already restricts reads to the owner. Everything is **dormant when Supabase is unconfigured** (client is null) — pages show a friendly "not available" state, never crash.

**Tech Stack:** React, `@supabase/supabase-js` (auth), Netlify Functions, Vitest (for the server-side account-creation logic).

**Spec:** `docs/superpowers/specs/2026-06-02-eap-backend-design.md` (Phase 3).

**Activation env:** client `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (publishable); server (functions) `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` + `PUBLIC_SITE_URL`. In Supabase Auth settings, add `${PUBLIC_SITE_URL}/set-password` to the allowed redirect URLs.

---

### Task 1: Server — create account on paid webhook (TDD)

**Files:**
- Create: `netlify/functions/_lib/accounts.js`
- Test: `netlify/functions/_lib/accounts.test.js`
- Modify: `netlify/functions/payment-webhook.js`

- [ ] **Step 1: Failing test** — `netlify/functions/_lib/accounts.test.js`:

```js
import { describe, it, expect, vi } from 'vitest';
import { createAccountForApplication } from './accounts.js';

function adminStub({ inviteResult }) {
  const invite = vi.fn().mockResolvedValue(inviteResult);
  const eq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn(() => ({ eq }));
  const client = {
    auth: { admin: { inviteUserByEmail: invite } },
    from: vi.fn(() => ({ update })),
  };
  return { client, invite, update, eq };
}

describe('createAccountForApplication', () => {
  it('invites the email and links user_id to the application', async () => {
    const { client, invite, update } = adminStub({
      inviteResult: { data: { user: { id: 'u-1' } }, error: null },
    });
    await createAccountForApplication(
      { admin: client, env: { PUBLIC_SITE_URL: 'https://site' } },
      { email: 'A@B.com', ref: 'mock_app-1' }
    );
    expect(invite).toHaveBeenCalledWith('a@b.com', { redirectTo: 'https://site/set-password' });
    expect(update).toHaveBeenCalledWith({ user_id: 'u-1' });
  });

  it('is a no-op (no throw) when the user already exists', async () => {
    const { client, update } = adminStub({
      inviteResult: { data: null, error: { message: 'User already registered' } },
    });
    await expect(
      createAccountForApplication({ admin: client, env: {} }, { email: 'x@y.com', ref: 'r' })
    ).resolves.toBeUndefined();
    expect(update).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run, verify fail.** `npm test -- accounts`.

- [ ] **Step 3: Implement** — `netlify/functions/_lib/accounts.js`:

```js
// Create (invite) a Supabase auth user for a paid application and link user_id.
// Safe no-op if the user already exists. Never throws to the webhook.
export async function createAccountForApplication({ admin, env }, { email, ref }) {
  const lower = (email || '').trim().toLowerCase();
  if (!lower) return;
  const redirectTo = `${env.PUBLIC_SITE_URL || ''}/set-password`;
  const { data, error } = await admin.auth.admin.inviteUserByEmail(lower, { redirectTo });
  if (error) {
    // Most common: user already exists — leave their account/link as-is.
    return;
  }
  const userId = data?.user?.id;
  if (userId) {
    await admin.from('applications').update({ user_id: userId }).eq('payment_ref', ref);
  }
}
```

- [ ] **Step 4: Wire into the webhook.** In `netlify/functions/payment-webhook.js`, replace the `// PHASE 3 HOOK` comment block with a call. The handler must fetch the application's email by `payment_ref` to pass it. Update `handleWebhook` so after marking paid:

```js
  // load email for the paid ref, then create the account
  const { data: app } = await admin.from('applications').select('email').eq('payment_ref', ref).single();
  if (app?.email) {
    await createAccountForApplication({ admin, env }, { email: app.email, ref });
  }
```
Add `import { createAccountForApplication } from './_lib/accounts.js';` and thread `env` into `handleWebhook` (signature becomes `handleWebhook({ admin, channel, env }, req)`; the Netlify `handler` passes `env: process.env`). Update the existing webhook test's calls to pass `env: {}` and a `select` stub returning `{ data: { email: 'a@b.com' } }` so it still passes. Keep the "not paid ⇒ no update" test green.

- [ ] **Step 5: Run, verify pass.** `npm test` (all green).

- [ ] **Step 6: Commit** — `git add -A netlify && git commit -m "feat: create auth account + invite email on paid webhook"`.

---

### Task 2: Client auth helper + provider

**Files:**
- Create: `src/lib/auth.js`
- Create: `src/hooks/useAuth.jsx`
- Modify: `src/main.jsx`

- [ ] **Step 1:** `src/lib/auth.js`:

```js
import { supabase } from './supabase.js';

export async function signIn(email, password) {
  if (!supabase) throw new Error('Auth not configured');
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw new Error(error.message);
  return data.user;
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut();
}

export async function setPassword(password) {
  if (!supabase) throw new Error('Auth not configured');
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(error.message);
}
```

- [ ] **Step 2:** `src/hooks/useAuth.jsx`:

```js
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';

const AuthContext = createContext({ user: null, loading: true });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
```

- [ ] **Step 3:** Wrap the app in `src/main.jsx` — import `AuthProvider` and place it inside `LanguageProvider`:

```jsx
<LanguageProvider>
  <AuthProvider>
    <App />
  </AuthProvider>
</LanguageProvider>
```
(add `import { AuthProvider } from './hooks/useAuth.jsx';`)

- [ ] **Step 4:** `npm run build` succeeds. Commit `git add -A src && git commit -m "feat: client auth helper + AuthProvider"`.

---

### Task 3: Pages — Login, SetPassword, Account; routes; header link; i18n

**Files:** Create `src/pages/Login.jsx`, `src/pages/SetPassword.jsx`, `src/pages/Account.jsx`; Modify `src/App.jsx`, `src/components/Header.jsx`, `src/i18n.js`, `src/styles.css`.

- [ ] **Step 1: i18n** — add an `account` block to each language (ru/en/kz/zh) in `src/i18n.js`. RU values (translate analogously for en/kz/zh):

```js
    account: {
      loginTitle: 'Вход в кабинет',
      email: 'Email',
      password: 'Пароль',
      signIn: 'Войти',
      signOut: 'Выйти',
      setPasswordTitle: 'Задайте пароль',
      setPasswordBtn: 'Сохранить пароль',
      cabinetTitle: 'Кабинет художника',
      yourApplications: 'Ваши заявки',
      statusPending: 'Ожидает оплаты',
      statusPaid: 'Оплачено',
      noApplications: 'Заявок пока нет.',
      notConfigured: 'Кабинет станет доступен после запуска приёма заявок.',
      loginError: 'Неверный email или пароль.',
      nav: 'Кабинет',
    },
```

- [ ] **Step 2: Login page** — `src/pages/Login.jsx`: email+password form → `signIn` → `navigate('/account')`; on error show `account.loginError`. If `!isSupabaseConfigured()` show `account.notConfigured`. Use existing `.apply-page`/`.field-group`/`.btn-ink` classes.

- [ ] **Step 3: SetPassword page** — `src/pages/SetPassword.jsx`: a password field → `setPassword(pw)` → `navigate('/account')`. (Supabase auto-detects the session from the invite link URL.) Guard on `isSupabaseConfigured()`.

- [ ] **Step 4: Account (cabinet)** — `src/pages/Account.jsx`: uses `useAuth()`. If `loading` → spinner text. If not configured → `account.notConfigured`. If no `user` → `navigate('/login')`. Else query `supabase.from('applications').select('*').eq('user_id', user.id)` and render each application (works titles, tier, `payment_status` via `statusPaid`/`statusPending`), plus a Sign out button (`signOut` → `/login`).

- [ ] **Step 5: Routes** — in `src/App.jsx` add `/login`, `/set-password`, `/account` routes for the three pages.

- [ ] **Step 6: Header link** — in `src/components/Header.jsx`, add a small `<Link to="/account">{t('account.nav')}</Link>` in the `header-right` group (before the apply button), shown only when `isSupabaseConfigured()`.

- [ ] **Step 7: Styles** — add minimal `.account-app-card`/status styles to `styles.css` reusing existing tokens (only if needed; prefer existing classes).

- [ ] **Step 8:** `npm run build` succeeds; `npm test` still green. Commit `git add -A && git commit -m "feat: login, set-password, and account cabinet pages"`.

---

## Self-Review

**Spec coverage (Phase 3):** account creation on paid (T1), confirmation/set-password email via invite redirect (T1 + T3 set-password), login (T3), cabinet showing own applications via RLS (T3), dormant-safe when unconfigured (guards throughout). ✓

**Placeholders:** T1 has full TDD code; T2 full code; T3 describes each page with exact data calls + classes and the i18n keys — implementer follows the established page pattern (`.apply-page`, `Field`, `btn-ink`). No TODOs.

**Type consistency:** `createAccountForApplication({admin,env},{email,ref})`, `handleWebhook({admin,channel,env},req)`, `signIn/signOut/setPassword`, `useAuth() → {user,loading}`, applications queried by `user_id` (matches RLS policy + the `user_id` set by the webhook). Consistent.

**Frontend tests:** no React Testing Library is set up; the auth pages are verified by build + manual (with keys). The server-side account logic (the risky part) is unit-tested in T1.
