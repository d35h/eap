---
name: product-ux-designer
description: Designs B2B SaaS pages, components, forms, tables, flows, and features with structured UX methodology. Triggers when designing pages, wireframing, making layout decisions, choosing containers, mapping states, defining conditional visibility, writing confirmation dialogs, speccing empty/error/loading states, ordering fields, reviewing designs, auditing pages, speccing for engineering, or researching users. Also triggers on "what should go on this page", "where should this field go", "what states does this need", "design this", "wireframe this", "review this design", or "audit this page".
argument-hint: "[page-name or component]"
---

# Product UX Designer

Think in flows not screens, states not static, tasks not pages. Interrogate and decide before wireframing. Wireframes are the last step, not the first.

## When to Use

- Designing a new page, form, table, dialog, wizard, drawer, chart, or dashboard
- Deciding what goes on a page, in what order, in what container
- Mapping states and actions for any B2B entity
- Defining conditional visibility rules
- Writing confirmation dialogs, empty states, error messages
- Reviewing or auditing an existing design
- Speccing a design for engineering handoff
- Running UX research or discovery on a feature

## When NOT to Use

- **UI polish** (spacing, color, animation) → Impeccable skills
- **Visual design** (palettes, typography) → design system / `.impeccable.md`
- **Code generation** → code comes AFTER all design decisions are recorded

---

## Decision Tiers

Not every decision needs the full pipeline. Match depth to stakes.

| Tier | Scope | Time | What to Run |
|------|-------|------|-------------|
| **Quick** | One component decision (modal vs drawer? button label?) | 30s | Container decision tree or copy rules → answer with rationale |
| **Standard** | One section or form (charge creation drawer, filter bar) | 5m | Load matching interrogator bank + interaction patterns → decisions + wireframe |
| **Deep** | Full page or multi-page flow (Products page, onboarding wizard) | 30m+ | Full 10-step pipeline → all deliverables |

Auto-detect tier from scope. If unclear, ask: "Is this a quick component decision, a single form/section, or a full page design?"

---

## Pipeline (Deep Tier — 10 Steps)

Every step produces a specific deliverable. Do not skip steps. Do not jump to wireframes.

**Deep Tier Progress Checklist** (copy and track):
```
- [ ] Step 1: Load project context
- [ ] Step 2: Competitor reference (3-6 sources)
- [ ] Step 3: Interrogate (fire ★ MUST-ASK questions)
- [ ] Step 4: State matrix (all states + compound)
- [ ] Step 5: Progressive disclosure tiers
- [ ] Step 6: High-stakes moments (friction levels)
- [ ] Step 7: Record decisions
- [ ] Step 8: ASCII wireframes (all states, real data, edge cases)
- [ ] Step 9: Copy (buttons, errors, empty states, confirmations)
- [ ] Step 10: Law review + 4 craft tests
```

### Step 1: Load YOUR Context
Read the project's existing docs for this page/feature. Look for:
- Page docs: `docs/pages/{page}/` — spec.md, design.md, flows.md, tests.md
- Module docs: `docs/modules/{module}/` — api.md, lifecycle.md, schema.md
- Cross-page context: product map, navigation structure, data ripple effects
- Existing wireframes or design decisions

**If page docs exist:** Note what's populated vs empty. The skill fills gaps.
**If no docs exist:** More interrogation needed, not less.

Check for a domain file in `domains/`. If the project has one, load it for domain-specific patterns, conditional visibility rules, and output format.

### Step 2: Competitor Reference (3-6 Source Rule)
With 30+ competitors in most B2B categories, 2 sources isn't enough. Check 3-6 sources before designing.

1. **Who already does this?** (name 3-6 sources — direct competitors, adjacent products, cross-industry)
2. **What does each get right/wrong?** (specific observations per source)
3. **Where do they converge?** (if 5/6 do the same thing → validated pattern, adopt it)
4. **Where do they diverge?** (if 2-3 differ → pick the best parts from each)
5. **What's our remix?** (validated patterns + best divergent ideas + our unique addition)

If user provides screenshots, analyze them. If not, draw from known B2B patterns.
Document genealogy: `"[Pattern] validated by [Source A, B, C]. Divergent approach from [Source D]. Our addition: [unique element]."`

The more sources that validate a pattern, the safer it is to adopt. Divergence signals an opportunity to pick the best approach — or invent something better.

### Step 3: Interrogate
Load the matching question bank from `reference/3-interrogator.md` based on component type. Fire MUST-ASK questions first (marked with ★). Record every answer as a decision.

Always run Bank 9 (Edge Case Stress Test) AFTER the primary bank.

### Step 4: State Matrix
Generate state-action matrices for every primary object on the page. Per `reference/1-decision-frameworks.md`:
- List ALL states including compound states
- For each: visual treatment, user emotion, available actions, disabled actions (with reason), hidden actions
- Design `error + empty + loading` states BEFORE `happy + full + idle`

### Step 5: Progressive Disclosure
Assign every field, column, option, and section to a tier:
- **Tier 1 (Always visible):** 3-5 things 80% of users need 80% of the time
- **Tier 2 (One click away):** Expandable sections, secondary tabs, "Advanced"
- **Tier 3 (Seek and find):** Settings, metadata, audit logs

Set smart defaults to minimize Tier 1. Document conditional display rules (elements that show/hide based on configuration state).

### Step 6: High-Stakes Moments
Identify actions that are irreversible, destructive, or change critical state. Apply the friction ladder from `reference/2-interaction-patterns.md`:

```
Level 0: No confirmation      → safe, reversible actions (edit name, toggle)
Level 1: Inline confirmation   → low-risk changes (archive with 0 dependencies)
Level 2: Dialog confirmation   → medium-risk (cancel subscription, void invoice)
Level 3: Type-to-confirm       → high-risk (delete with cascade, bulk operations)
```

For each high-stakes moment: preview impact with concrete numbers, show before/after, button repeats the action verb.

### Step 7: Decisions
Record every decision made in steps 1-6. Format per project's template, or use:

```
| # | Decision | Answer | Rationale | Genealogy | Lenses |
```

Apply 6 Lenses as kill signals (see below). Run pre-mortem: "6 months later, this page failed. What went wrong? Most likely failure mode? Early warning signal?"

### Step 8: ASCII Wireframes
Now — and only now — draw wireframes.

**Rules for wireframes:**
- **Real data always.** `$4,892.50`, `Acme Corp`, `sub_01J5K...`, `2026-03-24`. Never `$XX.XX` or `Item 1`.
- **Worst state first.** Draw the hardest state before the happy path.
- **Mark conditionals.** `[if credits]`, `[if contract]`, `[v2]` for elements that show/hide.
- **All page states.** Draw empty, loading, error, AND populated. Side by side if space allows.
- **Edge cases in wireframes.** Show: max-length names (64 chars), 12 graduated tiers, 0 items, 10,000 items, compound status (past_due + payment failing).
- **Every drawer/dialog state.** If a form morphs based on selection (e.g., pricing model changes fields), draw every variant.

### Step 9: Copy
Write all microcopy per `reference/5-copy-and-handoff.md`:
- Button labels (action verb + object: "Create plan", not "Submit")
- Error messages (what happened + why + what to do)
- Empty states (invitation, not apology: "No invoices yet" + CTA, not "Sorry, nothing here")
- Confirmation dialogs (state consequences with concrete numbers)
- Disabled tooltips (why + what to do: "Finalize this invoice before collecting payment")
- Help text for every non-obvious field

### Step 10: Law Review
Quality check against `reference/4-laws-and-heuristics.md`:
- **Jakob's Law:** Does this match patterns users already know?
- **Hick's Law:** Too many choices on screen? (≤3 primary decisions)
- **Fitts's Law:** Primary actions large and close? Destructive actions small and far?
- **Von Restorff:** Do anomalies visually stand out?
- **Zeigarnik:** What incomplete states surface in nav/dashboard?
- **Peak-End Rule:** What's the best moment? What's the last thing user sees?

Run 4 Craft Tests before presenting:
1. **Swap** — Replace your choices with common alternatives. No meaningful difference = no real choices made.
2. **Squint** — Blur your eyes. Hierarchy, state, and next action still perceivable?
3. **Signature** — 3 places where THIS product's identity shows?
4. **Token** — Read labels out loud. Sound like THIS product or any product?

---

## Reference Loading

| Designing a... | Load These |
|---|---|
| **Form** | `3-interrogator` (Bank 1) + `2-interaction-patterns` (Forms) + `5-copy-and-handoff` |
| **Table / List** | `3-interrogator` (Bank 2) + `2-interaction-patterns` (Tables) |
| **Detail page** | `3-interrogator` (Bank 3) + `1-decision-frameworks` (OOUX + State Matrix) |
| **Dialog / Confirmation** | `3-interrogator` (Bank 4) + `2-interaction-patterns` (Destructive Actions) + `5-copy-and-handoff` |
| **Wizard / Multi-step** | `3-interrogator` (Bank 5) + `2-interaction-patterns` (Forms) + `1-decision-frameworks` |
| **Drawer** | `3-interrogator` (Bank 6) + `2-interaction-patterns` (Containers) |
| **Chart / Dashboard** | `3-interrogator` (Bank 7) + `4-laws-and-heuristics` |
| **Empty / Error / Loading** | `3-interrogator` (Bank 8) + `5-copy-and-handoff` + `1-decision-frameworks` (State Matrix) |
| **Navigation / IA** | `1-decision-frameworks` (OOUX) + `2-interaction-patterns` (Nav) + `4-laws-and-heuristics` |
| **Full page (Deep)** | All of the above. Start with `1-decision-frameworks`, end with `4-laws-and-heuristics`. |
| **Any component** | `3-interrogator` (Bank 9) — run AFTER primary bank |
| **Research / Discovery** | `6-research-discovery` |
| **Design Audit** | `4-laws-and-heuristics` (Nielsen audit checklist) |
| **Domain-specific** | `domains/{domain}.md` — load when project has a domain file |

---

## 6 Lenses (Kill Signals)

Apply after Step 6, before recording final decisions. If any lens returns a kill signal, stop and discuss.

| Lens | Question | Kill Signal |
|---|---|---|
| **10x?** | Is this 10x better than what exists, or 10% better? | "It's slightly better" = not worth building |
| **Position?** | Does this reinforce your product's core positioning? | Can't connect to your differentiator |
| **Habit?** | Will users return to this page regularly? | Monthly-only or never-return engagement |
| **ICP?** | Would your ideal customer pay for this? | "Nice to have" with no willingness to pay |
| **Ship?** | Can you ship MVP in <2 weeks? | Needs new infrastructure or 3+ new APIs |
| **Steal?** | Can you name 3-6 inspiration sources? | Nobody does this and no analog exists |

---

## B2B Overrides

These override generic UX advice. B2B apps are not consumer apps.

| # | Insight | Reference |
|---|---------|-----------|
| 1 | **500th visit > 1st visit.** Expert efficiency over onboarding. Power users are the product. | `4-laws-and-heuristics` (Paradox of Active User) |
| 2 | **No number without context.** Every metric needs comparison, trend, deadline, or threshold. | `1-decision-frameworks` (Progressive Disclosure) |
| 3 | **Time is the hidden dimension.** Surface dates, periods, countdowns, expiry, deadlines. | `2-interaction-patterns` |
| 4 | **Buyer ≠ User.** 4 roles share 1 product (Buyer, Admin, User, Finance). Primary actor per page. | `1-decision-frameworks` (OOUX) |
| 5 | **Error paths > happy paths.** 60% of design time on errors + compound states. | `2-interaction-patterns` |
| 6 | **Design for interruption.** Breadcrumbs, CMD+K, unsaved warnings, persistent filters. | `2-interaction-patterns` |

---

## Common Mistakes

| Mistake | Fix |
|---|---|
| Jumping to wireframes | Run interrogator first — 5 min of questions prevents 5 hours of rework |
| Happy path first | Design error + empty + loading BEFORE happy + full + idle |
| Placeholder data | Use real amounts, entity IDs, company names, dates |
| "Are you sure?" dialogs | State consequences with concrete numbers. Button repeats the action |
| Ignoring compound states | What if past_due + payment failing + pending change + trial expiring? |
| B2C patterns in B2B | 500th visit > 1st. Expert efficiency over onboarding polish |
| One wireframe per page | Draw EVERY state: empty, loading, error, populated, edge case, drawer variants |
| Missing disabled tooltips | Every disabled element explains WHY and WHAT TO DO |

---

## Workflow

- **Show your work through deliverables.** The interrogation produces decisions. The state analysis produces matrices. The wireframes show edge cases. No process narration needed — the outputs speak.
- **Lead with the hard question.** First output = hardest edge case, not happy path.
- **After every session,** offer to save decisions, states, and wireframes to the project's page doc files.
- **If user says "skip the questions"** — push back once: "5 minutes of questions prevents 5 hours of rework." If they insist, flag every assumption as `[UNVALIDATED]`.
- **Forcing functions when stuck:**
  - "How does [known competitor] handle this?"
  - "What if we had to ship in 48 hours?"
  - "What if we can't change this for 2 years?"
  - "What would a power user who sees this page 50x/day want?"
