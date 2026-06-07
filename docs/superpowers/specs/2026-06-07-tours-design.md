# Two-Tour Jury Selection — Design Spec (future feature)

**Status:** design proposal — NOT yet approved or implemented. Open questions at the end.

**Goal:** Run jury evaluation in **two tours**. Tour 1: jurors evaluate all paid applications; the admin advances the top **N** (default = half, overridable) to Tour 2. Tour 2: jurors evaluate the advanced subset; the admin selects the **top 3** (overridable). The admin drives tour transitions from the cabinet.

---

## 1. Core concepts

- **Tour** — a numbered evaluation round (1, then 2). Exactly one tour is "active" at a time for the cycle.
- **Standing** — per application, per tour: `active` (being evaluated), `advanced` (moved to next tour), `eliminated`, or `winner`.
- **Score** — an application's tour score = the **average, across jurors who *finished* their review in that tour, of the sum of that juror's criterion ratings**. (With 2 criteria × 0–10, max sum = 20.) Used only to *rank* and pre-select; the admin always has final say.
- Reviews are **per tour**: a juror evaluates each application again in Tour 2, so a review row is keyed by `(application, juror, tour)`.

---

## 2. Selection mechanism (recommended)

Score-based ranking **with admin override** — best balance of automation and control:

1. Jurors finish their evaluations for the active tour.
2. Admin opens the **Tours panel**, which shows applications **ranked by tour score** with each one's score and reviewer count.
3. Admin sets **N** (advance count) — pre-filled with the default (Tour 1: `ceil(total/2)`; Tour 2: `3`) but editable.
4. The top N are pre-checked; the admin can **manually toggle** any application (override individual picks), then clicks **Confirm**.
5. On confirm: chosen → `advanced` (Tour 1) / `winner` (Tour 2) and bumped to the next tour; the rest → `eliminated`.

Rejected alternatives: (a) pure auto-cutoff with no manual override — too rigid, ties/edge cases need judgment; (b) per-juror explicit shortlists — duplicates the rating work we already capture and complicates aggregation.

---

## 3. Data model

**New singleton table `cycle_state`** (one row for the current open call):
| column | type | notes |
|---|---|---|
| `id` | int primary key default 1 | enforced single row (`check (id = 1)`) |
| `active_tour` | int default 1 | 1 or 2 |
| `tour1_open` | bool default false | jurors can evaluate tour 1 |
| `tour2_open` | bool default false | jurors can evaluate tour 2 |
| `updated_at` | timestamptz | |

**`applications`** gains:
- `tour` int default 1 — current tour the application sits in.
- `standing` text default 'active' — `active` | `advanced` | `eliminated` | `winner`.

**`application_reviews`** gains:
- `tour` int not null default 1 — which tour this review belongs to.
- Replace unique `(application_id, reviewer_id)` with **`(application_id, reviewer_id, tour)`** so a juror can evaluate the same work again in Tour 2.

---

## 4. RLS / server logic

- `cycle_state`: staff read; **admin-only** update. (Or update via a Netlify function for safety.)
- Advancing/eliminating is a privileged bulk update over `applications.standing`/`tour`. Do it in a **Netlify function `run-tour-transition`** (admin-authorized, service role): compute scores, apply the admin's confirmed selection set, write standings atomically. Keeps the ranking logic server-side and avoids trusting the client with bulk writes.
- Juror review insert/update policies extend to include the `tour` column; jurors may only write reviews for the **active, open** tour.

---

## 5. Admin UI — the Tours panel

A panel at the top of the admin cabinet (above the applications list):

```
Тур 1  ·  идёт                       [ Открыть приём оценок ] [ Закрыть тур ]
  12 заявок · оценили 3/4 жюри
  Завершить тур 1 → отобрать [  6  ] заявок   [ Перейти к отбору ]

(selection step, after "Перейти к отбору":)
  # | заявка            | балл | ✓advance
  1 | Иванов · 17.5     | 17.5 | [x]
  2 | Петров · 16.0     | 16.0 | [x]
  ...
  7 | ...               | 9.0  | [ ]
                                   [ Подтвердить отбор ]
```

- **Buttons** (the "multiple buttons" the user asked for), gated by state:
  - `Открыть приём оценок` / `Закрыть тур` — toggles `tourN_open`.
  - `Перейти к отбору` — opens the ranked selection list with the N input.
  - `Подтвердить отбор` — runs the transition (advance N, eliminate rest, set `active_tour`).
  - `Начать тур 2` — appears after Tour 1 is finalized.
  - `Завершить · выбрать топ-3` — Tour 2's finalize (default N=3).
- The applications list gets a **standing badge** (Активна / Прошла / Выбыла / Победитель) and, in Tour 2, shows only `advanced` applications.

## 6. Juror experience

- Juror's list = applications where `tour = active_tour AND standing = 'active' AND tourN_open`. They never see standings, scores, or other jurors (unchanged).
- In Tour 2 they re-evaluate the advanced subset; their Tour 1 reviews remain (separate `tour`).
- Cabinet chip already shows Не оценено / Черновик / Завершено — now per active tour.

---

## 7. Edge cases & rules

- **Ties at the cutoff:** the manual-toggle list lets the admin break them explicitly; no silent rule needed.
- **N bounds:** 1 ≤ N ≤ count of active applications; default Tour 1 = `ceil(active/2)`, Tour 2 = `min(3, active)`.
- **Re-running a transition:** allowed before Tour 2 opens (recompute from current standings); once Tour 2 is open, Tour 1 is locked.
- **Applications with no finished reviews:** score = none; sorted last; admin decides.
- **New paid applications arriving mid-Tour-1:** enter as `tour=1, standing=active` (fine while Tour 1 open).

---

## 8. Out of scope (for the first version)

- Weighting criteria differently; per-criterion tie-breaks.
- More than two tours (model supports it, UI assumes two).
- Notifying jurors/applicants on tour changes.
- Public display of winners.

---

## 9. Open questions for confirmation

1. **Selection basis** — average sum-of-ratings as proposed, or a different aggregation (e.g. average per-criterion, or median to resist outliers)?
2. **Who counts toward a score** — only jurors who **finished**, or include drafts? (Proposal: finished only.)
3. **Quorum** — should advancing require a minimum number of jurors to have reviewed (e.g. ≥ half), or can the admin advance regardless?
4. **Manual override depth** — is "toggle any application in the ranked list" enough, or do you also want the admin to add a non-top application directly?
5. **Tour 2 default** — fixed top-3, or also a percentage like Tour 1?
