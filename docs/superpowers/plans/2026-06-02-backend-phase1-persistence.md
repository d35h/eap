# EAP Backend — Phase 1: Application Persistence — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist each submitted application (form data + work files) to Supabase Postgres + Storage when the applicant completes the wizard.

**Architecture:** A thin data-access layer (`applicationsRepo`) wraps an injected Supabase client so it is unit-testable with a fake client. `Apply.jsx`'s `submitFinal` calls the repo to insert a `pending` application row and upload each work file, then proceeds with the existing (still-simulated) payment success. A SQL migration provisions the table, RLS, and a private Storage bucket.

**Tech Stack:** React + Vite, `@supabase/supabase-js`, Vitest (new), Supabase (Postgres + Storage).

**Spec:** `docs/superpowers/specs/2026-06-02-eap-backend-design.md` (Phase 1).

**Prerequisite (owner):** A Supabase project exists and these are set in `.env` (Vite exposes `VITE_`-prefixed vars to the client):
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Tasks 1–4 run without them (mocked); Tasks 5–7 need the project.

---

### Task 1: Set up Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.js`
- Create: `src/lib/__smoke__.test.js`

- [ ] **Step 1: Install Vitest**

Run: `npm install -D vitest@^2`
Expected: added to devDependencies, no errors.

- [ ] **Step 2: Add the test script to package.json**

In `package.json` `"scripts"`, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create vitest.config.js**

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
});
```

- [ ] **Step 4: Write a smoke test**

`src/lib/__smoke__.test.js`:

```js
import { describe, it, expect } from 'vitest';

describe('vitest', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run it**

Run: `npm test`
Expected: PASS (1 test).

- [ ] **Step 6: Delete the smoke test and commit**

```bash
rm src/lib/__smoke__.test.js
git add package.json package-lock.json vitest.config.js
git commit -m "chore: add Vitest test runner"
```

---

### Task 2: Supabase client module

**Files:**
- Create: `src/lib/supabase.js`
- Create: `.env.example`

- [ ] **Step 1: Install the Supabase client**

Run: `npm install @supabase/supabase-js@^2`
Expected: added to dependencies.

- [ ] **Step 2: Create the client module**

`src/lib/supabase.js`:

```js
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Null when env is absent so the app still builds/runs without Supabase configured.
export const supabase = url && anonKey ? createClient(url, anonKey) : null;

export const isSupabaseConfigured = () => Boolean(supabase);
```

- [ ] **Step 3: Document env vars**

`.env.example`:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

- [ ] **Step 4: Verify build still works**

Run: `npm run build`
Expected: build succeeds (client is `null` without env — that's fine).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/lib/supabase.js .env.example
git commit -m "feat: add Supabase client module"
```

---

### Task 3: `applicationsRepo.createApplication`

**Files:**
- Create: `src/lib/applicationsRepo.js`
- Test: `src/lib/applicationsRepo.test.js`

The repo takes a client as an argument so tests inject a fake. A convenience
default export binds the real `supabase` client.

- [ ] **Step 1: Write the failing test**

`src/lib/applicationsRepo.test.js`:

```js
import { describe, it, expect, vi } from 'vitest';
import { createApplication } from './applicationsRepo.js';

function fakeClient(insertResult) {
  const single = vi.fn().mockResolvedValue(insertResult);
  const select = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select }));
  const from = vi.fn(() => ({ insert }));
  return { client: { from }, from, insert };
}

describe('createApplication', () => {
  it('inserts a pending application and returns the row', async () => {
    const row = { id: 'app-1', email: 'a@b.com', payment_status: 'pending' };
    const { client, from, insert } = fakeClient({ data: row, error: null });

    const result = await createApplication(client, {
      email: 'A@B.com',
      firstName: 'Ann',
      lastName: 'Lee',
      country: 'KZ',
      city: 'Almaty',
      website: '',
      instagram: '',
      works: [{ title: 'W1', year: '2024', media: '', size: '', desc: 'd' }],
      tier: 1,
    });

    expect(from).toHaveBeenCalledWith('applications');
    const payload = insert.mock.calls[0][0];
    expect(payload.email).toBe('a@b.com'); // lowercased
    expect(payload.payment_status).toBe('pending');
    expect(payload.tier).toBe(1);
    expect(payload.works).toHaveLength(1);
    expect(result).toEqual(row);
  });

  it('throws on supabase error', async () => {
    const { client } = fakeClient({ data: null, error: { message: 'boom' } });
    await expect(
      createApplication(client, { email: 'x@y.com', works: [], tier: 1 })
    ).rejects.toThrow('boom');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test`
Expected: FAIL ("createApplication is not a function" / module not found).

- [ ] **Step 3: Implement `createApplication`**

`src/lib/applicationsRepo.js`:

```js
import { supabase } from './supabase.js';

const AMOUNT_BY_TIER = { 1: 100, 2: 150, 3: 170 };

// Insert a pending application. `client` is injected for testability.
export async function createApplication(client, form) {
  const payload = {
    email: (form.email || '').trim().toLowerCase(),
    first_name: form.firstName || '',
    last_name: form.lastName || '',
    country: form.country || '',
    city: form.city || '',
    website: form.website || '',
    instagram: form.instagram || '',
    works: (form.works || []).map((w) => ({
      title: w.title || '',
      year: w.year || '',
      media: w.media || '',
      size: w.size || '',
      desc: w.desc || '',
    })),
    tier: form.tier,
    amount: AMOUNT_BY_TIER[form.tier] ?? AMOUNT_BY_TIER[3],
    currency: 'BYN',
    payment_status: 'pending',
  };

  const { data, error } = await client
    .from('applications')
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// Bound to the real client for app use.
export function submitApplication(form) {
  if (!supabase) throw new Error('Supabase is not configured');
  return createApplication(supabase, form);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/applicationsRepo.js src/lib/applicationsRepo.test.js
git commit -m "feat: createApplication repo with server-derived amount"
```

---

### Task 4: `uploadWorkFiles` (work files → Storage, paths back into the row)

**Files:**
- Modify: `src/lib/applicationsRepo.js`
- Modify: `src/lib/applicationsRepo.test.js`

- [ ] **Step 1: Write the failing test**

Append to `src/lib/applicationsRepo.test.js`:

```js
import { uploadWorkFiles } from './applicationsRepo.js';

function fakeStorageClient(uploadResult) {
  const upload = vi.fn().mockResolvedValue(uploadResult);
  const fromStorage = vi.fn(() => ({ upload }));
  return { client: { storage: { from: fromStorage } }, fromStorage, upload };
}

describe('uploadWorkFiles', () => {
  it('uploads each non-null file and returns its storage path', async () => {
    const { client, fromStorage, upload } = fakeStorageClient({ error: null });
    const files = [
      { name: 'a.jpg', type: 'image/jpeg' },
      null,
      { name: 'c.png', type: 'image/png' },
    ];

    const paths = await uploadWorkFiles(client, 'app-1', files);

    expect(fromStorage).toHaveBeenCalledWith('works');
    expect(upload).toHaveBeenCalledTimes(2);
    expect(paths).toEqual([
      'applications/app-1/work1.jpg',
      null,
      'applications/app-1/work3.png',
    ]);
  });

  it('throws if an upload errors', async () => {
    const { client } = fakeStorageClient({ error: { message: 'no space' } });
    await expect(
      uploadWorkFiles(client, 'app-1', [{ name: 'a.jpg' }])
    ).rejects.toThrow('no space');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test`
Expected: FAIL ("uploadWorkFiles is not a function").

- [ ] **Step 3: Implement `uploadWorkFiles`**

Append to `src/lib/applicationsRepo.js`:

```js
const extOf = (file) => {
  const fromName = (file.name || '').split('.').pop();
  return fromName && fromName.length <= 5 ? fromName.toLowerCase() : 'bin';
};

// Upload one file per work (index-aligned). Null entries are skipped.
// Returns an array of storage paths (null where no file).
export async function uploadWorkFiles(client, applicationId, files) {
  const paths = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file) {
      paths.push(null);
      continue;
    }
    const path = `applications/${applicationId}/work${i + 1}.${extOf(file)}`;
    const { error } = await client.storage
      .from('works')
      .upload(path, file, { upsert: true });
    if (error) throw new Error(error.message);
    paths.push(path);
  }
  return paths;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (4 tests total).

- [ ] **Step 5: Commit**

```bash
git add src/lib/applicationsRepo.js src/lib/applicationsRepo.test.js
git commit -m "feat: uploadWorkFiles to Supabase Storage"
```

---

### Task 5: SQL migration (table + RLS + Storage bucket)

**Files:**
- Create: `db/migrations/0001_applications.sql`

This is run by the owner in the Supabase SQL editor (not executable from CI).

- [ ] **Step 1: Write the migration**

`db/migrations/0001_applications.sql`:

```sql
-- Applications table
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  first_name text default '',
  last_name text default '',
  country text default '',
  city text default '',
  website text default '',
  instagram text default '',
  works jsonb not null default '[]',
  tier int not null,
  amount int not null,
  currency text not null default 'BYN',
  payment_status text not null default 'pending',
  payment_provider text,
  payment_ref text,
  user_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.applications enable row level security;

-- Anonymous applicants may create a pending application (the form runs before auth).
create policy "anon can insert pending applications"
  on public.applications for insert
  to anon
  with check (payment_status = 'pending');

-- A logged-in user can read only their own application(s).
create policy "owner can read own applications"
  on public.applications for select
  to authenticated
  using (auth.uid() = user_id);

-- Private Storage bucket for work files.
insert into storage.buckets (id, name, public)
values ('works', 'works', false)
on conflict (id) do nothing;

-- Anonymous client may upload into the works bucket (paths are app-scoped).
create policy "anon can upload work files"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'works');
```

- [ ] **Step 2: Apply it**

In Supabase Dashboard → SQL Editor, paste and run the file.
Expected: "Success. No rows returned." Table `applications` appears under Table Editor; bucket `works` under Storage.

- [ ] **Step 3: Commit**

```bash
git add db/migrations/0001_applications.sql
git commit -m "feat: applications table + RLS + works storage bucket (migration)"
```

---

### Task 6: Wire `Apply.jsx` submit to persistence

**Files:**
- Modify: `src/pages/Apply.jsx` (the `submitFinal` function)

Persist the application + files before the existing simulated success. If
Supabase isn't configured, fall back to the current simulated behaviour so the
demo keeps working.

- [ ] **Step 1: Import the repo and config check**

At the top of `src/pages/Apply.jsx`, add to the existing imports:

```js
import { submitApplication, uploadWorkFiles } from '../lib/applicationsRepo.js';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
```

- [ ] **Step 2: Replace the body of `submitFinal`**

Find the existing `submitFinal` and replace its `try` body with:

```js
    setSubmitting(true);
    try {
      if (isSupabaseConfigured()) {
        const application = await submitApplication({ ...form, tier: form.works.length });
        const paths = await uploadWorkFiles(supabase, application.id, workFiles);
        console.log('Application stored:', application.id, paths);
        // NOTE: payment + marking paid arrives in Phase 2 (webhook). For now the
        // row stays 'pending' and we show the success screen.
      } else {
        await new Promise((res) => setTimeout(res, 1800)); // simulated fallback
        console.log('Submitted (simulated):', form, workFiles.map((f) => f?.name || null));
      }

      clearForm();
      setWorkFiles([null]);
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      console.error(e);
      setSubmitting(false);
      alert('Submission error. Please try again.');
    }
```

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Manual check (Supabase configured)**

With `.env` set, run `npm run dev`, complete the wizard, click pay.
Expected: a new row in `applications` (status `pending`) and files under
`works/applications/<id>/` in Supabase Storage; success screen shows.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Apply.jsx
git commit -m "feat: persist application + work files to Supabase on submit"
```

---

### Task 7: Wire Netlify env + README note

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document env + Netlify**

Append a "Backend (Phase 1)" section to `README.md`:

```markdown
## Backend — Phase 1 (persistence)

Set in `.env` locally and in Netlify (Site settings → Environment variables):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Run `db/migrations/0001_applications.sql` in the Supabase SQL editor once.
Without these vars the form falls back to simulated submit (no data stored).
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: document Phase 1 backend env + migration"
```

---

## Self-Review

**Spec coverage (Phase 1):**
- Supabase project + `applications` table + RLS → Task 5. ✓
- Storage bucket `works/`, files at `applications/{id}/work{n}.ext` → Tasks 4, 5. ✓
- Client writes the row + uploads files on submit → Task 6. ✓
- Server-derived amount (don't trust client) → Task 3 (`AMOUNT_BY_TIER`); full
  server-side enforcement lands with the payment function in Phase 2. ✓ (noted)
- Payment still simulated, row stays pending until Phase 2 webhook → Task 6 note. ✓

**Placeholder scan:** No TBD/TODO; every code step has full code. The Phase-2
"mark paid" is intentionally deferred and called out, not a placeholder.

**Type consistency:** `createApplication(client, form)` / `submitApplication(form)`
/ `uploadWorkFiles(client, applicationId, files)` names and signatures match
across Tasks 3, 4, 6. `works` shape (`title/year/media/size/desc`) matches
`Apply.jsx`'s `emptyWork()`. `workFiles` (parallel File array) matches Apply.jsx
state. Storage bucket id `works` consistent across Tasks 4 and 5.

**Out of scope (Phase 2/3):** payment session creation, webhook, marking paid,
account creation, confirmation email, login, cabinet — separate plans.
