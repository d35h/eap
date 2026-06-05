# Juror Structured Evaluation — Design

**Goal:** Let a juror evaluate a paid application against a fixed set of criteria — a 0–10 rating plus a written review (≥130 chars) per criterion — with save-draft / finish-and-lock, and an admin override to reopen a specific juror's evaluation. Jurors no longer see payment status; they see only their own evaluation state.

**Status:** design — pending user approval.

---

## 1. Criteria (editable config)

Criteria live in **one config array** (`src/lib/reviewCriteria.js`) so wording is a one-line edit and the form/validation are driven by it generically. Each entry: `{ key, title, hint }` where `hint` is the guidance text shown to the juror.

Seeded list (RU — **confirm/edit titles + hints**):

1. `idea` — **Идея и высказывание** — «Есть ли за работой ясный замысел и авторское высказывание, а не только исполнение.»
2. `emotion` — **Эмоциональное воздействие** — «Вызывает ли работа отклик, атмосферу, энергию у зрителя.»
3. `craft` — **Идея важнее техники** — «Высокая техника ≠ сильное искусство. Иногда грубая, но честная работа сильнее идеально исполненной.»
4. `originality` — **Оригинальность** — «„Я уже видел это сто раз?" Собственный мир, узнаваемость, авторский почерк, своя символика, новая визуальная идея.»

Criteria are RU-only (the staff cabinet is Russian-only). Adding/removing/renaming a criterion = editing this array; everything else adapts.

---

## 2. Data model

Extend `public.application_reviews` (already one row per application+juror):

| column | type | notes |
|---|---|---|
| `scores` | `jsonb` default `'{}'` | `{ <criterionKey>: { rating: 0-10, text: string } }` |
| `status` | `text` default `'draft'` | `check in ('draft','finished')` |
| `unlocked` | `boolean` default `false` | admin override to allow edits after finish |
| `updated_at` | `timestamptz` default `now()` | |
| `finished_at` | `timestamptz` null | set when finished |

The existing `reviewer_id`, `reviewer_email`, unique `(application_id, reviewer_id)` stay. A draft row is created on first save.

**Validation (enforced in UI; `finished` gated server-side):** to finish, **every** criterion in the config must have `rating` in 0–10 and `text` length ≥ 130 (trimmed). Draft has no minimums.

---

## 3. RLS

- **Insert** (juror only, own row): unchanged — `reviewer_id = auth.uid()` and role `juror`.
- **Update** (juror, own row): allowed while `status = 'draft'` **OR** `unlocked = true`. `USING` checks the existing row; once `finished` and not `unlocked`, updates are blocked at the DB. `WITH CHECK`: `reviewer_id = auth.uid()` **and `unlocked = false`** — a juror can never set `unlocked` themselves (only admin can). When the juror **finishes**, the row is written with `status='finished', unlocked=false`, so the lock re-engages every time.
- **Admin update**: a separate policy lets `role = 'admin'` update a review row (used only to set `unlocked`; UI exposes nothing else). On unlock, admin sets `unlocked=true, status='draft'` so the juror can edit and re-finish.
- **Select**: unchanged — admin reads all; juror reads only their own.

A server-side trigger keeps the artist-facing `applications.review_status`: set to `'reviewed'` when a row reaches `status = 'finished'` (not on draft). (Adjust the existing `mark_application_reviewed` trigger to fire on finish, not on insert.)

---

## 4. Lifecycle

```
[no row] --Оценить--> [draft] --Сохранить черновик--> [draft]
                         |                                 
                         +--Завершить оценку (all valid)--> [finished, locked]
[finished] --admin "Разрешить редактирование"--> [draft, unlocked] --Завершить--> [finished]
```

- **Сохранить черновик**: upsert `scores` + `status='draft'`, anytime, no minimums. Juror can leave and return.
- **Завершить оценку**: enabled only when all criteria valid → `status='finished'`, `finished_at=now()`, `unlocked=false`. Then read-only for the juror.
- **Admin unlock**: per application + per juror, sets `unlocked=true, status='draft'`. That one juror can edit again and re-finish.

---

## 5. UI

**Route (b):** `/account/review/:applicationId` — a dedicated evaluation page (staff/juror only; redirect others). Reachable from the cabinet via the **«Оценить»** button on an application.

**Form:** wizard-style switcher like the works step — a vertical/tab list of the criteria; clicking one shows just that criterion's **rating 0–10** (e.g. 0–10 segmented buttons or a select) + **textarea** with a live character counter and the ≥130 hint. Each criterion shows a ✓ when valid. Footer: **«Сохранить черновик»** (always) and **«Завершить оценку»** (disabled until all ✓). When the row is `finished` and not `unlocked`, the whole form is read-only with a notice.

**Cabinet (juror):** no payment badge. Each application shows the juror's own state — **Не оценено / Черновик / Завершено** — and an **«Оценить»** button (label «Продолжить» if a draft exists, hidden/disabled “Завершено” when finished & locked).

**Cabinet (admin):** unchanged payment + applicant info, plus per application a breakdown of each juror: email, status (Черновик/Завершено), their ratings+texts (expandable), and **«Разрешить редактирование»** when finished.

---

## 6. Out of scope (YAGNI)

- Aggregate scoring / ranking across jurors (admin reads raw ratings; no averaging UI now).
- Localizing criteria beyond RU.
- Per-criterion attachments or threaded comments.
- Notifying jurors/artists on unlock.

---

## 7. Files touched

- `db/migrations/0008_review_evaluation.sql` — columns, RLS update/admin policies, trigger change.
- `src/lib/reviewCriteria.js` — criteria config (new).
- `src/lib/reviewsRepo.js` — load/save draft, finish, admin unlock (new).
- `src/pages/ReviewEvaluation.jsx` — the `/account/review/:id` page (new).
- `src/pages/Account.jsx` — juror state + «Оценить» link; admin per-juror breakdown + unlock; drop payment badge for jurors.
- `src/App.jsx` — route.
- `src/styles.css` — evaluation form styles.
