# The Interrogator — Question Banks

> Force micro-decisions before a single pixel is placed. Every question targets a decision that, if skipped, causes rework.

## Contents
- [How to Use](#how-to-use)
- [Bank 1: Forms](#bank-1-forms-18-questions) (18 questions)
- [Bank 2: Tables](#bank-2-tables-15-questions) (15 questions)
- [Bank 3: Detail Pages](#bank-3-detail-pages-12-questions) (12 questions)
- [Bank 4: Dialogs](#bank-4-dialogs-8-questions) (8 questions)
- [Bank 5: Wizards](#bank-5-wizards-8-questions) (8 questions)
- [Bank 6: Drawers](#bank-6-drawers-6-questions) (6 questions)
- [Bank 7: Charts & Dashboards](#bank-7-charts--dashboards-8-questions) (8 questions)
- [Bank 8: Empty/Error/Loading](#bank-8-empty--error--loading-states-8-questions) (8 questions)
- [Bank 9: Edge Case Stress Test](#bank-9-edge-case-stress-test-run-after-primary-bank) (always run after primary bank)

## How to Use

1. Identify the component type — form, table, detail page, dialog, wizard, drawer, chart, or empty state.
2. Load the matching bank below.
3. Fire ★ MUST-ASK questions first. These are non-negotiable.
4. Continue with remaining questions if time allows.
5. Record every answer as a decision: `| D{N} | {Question summary} | {Answer} | {Rationale} |`
6. Run Bank 9 (Edge Case Stress Test) AFTER the primary bank. Always.

### Two Rules

**Worst-case-first.** Always ask about the hardest state before the easiest. "What happens with 10,000 rows?" before "what does the happy path look like?"

**Real data always.** Never placeholder data. Use realistic data: `sub_01J5K...` IDs, `$4,900.00` amounts, `api-calls` slugs, `Pro Monthly (v3)` plan names, `Acme Corp` names.

---

## Bank 1: Forms (18 Questions)

★ **Q1:** What is the worst combination of conditional fields that can appear simultaneously?
★ **Q2:** Which fields are required vs optional, and how do you visually distinguish them?
★ **Q3:** When does validation fire — on blur, on change, or on submit?
★ **Q4:** What are the smart defaults, and which fields are pre-filled?
★ **Q5:** What fields appear/disappear based on other field values? Map every conditional chain.

Q6: Is this single-step or multi-step? (>8 fields or 4+ natural groups → consider multi-step)
Q7: What does the submit button label say? (action verb + object, never "Save" or "Submit")
Q8: What happens on successful submission? (toast + navigate? close drawer + refetch?)
Q9: What happens when submission fails? (field-level errors? banner? preserve all input?)
Q10: Who can access this form? Do fields change by role?
Q11: What does the form look like with worst-case data already filled? (64-char name, 12 tiers, 500-char description)
Q12: Does the form work on mobile (375px)? If not, say so explicitly.
Q13: Can the user save a draft and return later?
Q14: What happens when the user clicks Cancel or navigates away? (unsaved changes dialog?)
Q15: Keyboard navigation — tab order follows visual order? Enter submits? Escape closes?
Q16: Any fields requiring async validation? (slug uniqueness, email availability — debounce 500ms)
Q17: Field layout — single column or mixed? (single column default, paired only for related fields)
Q18: Does the form support repeated entries? (tiers, entitlements, rules — each row needs add/remove/validate)

---

## Bank 2: Tables (15 Questions)

★ **Q1:** What does this table look like with 10,000 rows?
★ **Q2:** What are the T1 (always visible) and T2 (overflow) columns? Max 5-6 T1 columns.
★ **Q3:** What is the default sort, and why?
★ **Q4:** Which columns are filterable, and what filter types?
★ **Q5:** What happens when the user clicks a row? (navigate to detail? open drawer?)

Q6: What row-level actions exist? (three-dot menu, 3-5 max, destructive last in red)
Q7: Are there bulk operations? Which ones are safe for bulk?
Q8: What does the empty state look like? (two types: global empty vs filtered empty)
Q9: Pagination strategy and page size?
Q10: What does search cover? Server-side?
Q11: Is there an export function? What formats?
Q12: What does the loading state look like? (skeleton rows, not spinner replacing table)
Q13: Are there conditional columns that show/hide based on context?
Q14: Who can see what? Do columns change by role?
Q15: What does the mobile view look like? Which columns collapse?

---

## Bank 3: Detail Pages (12 Questions)

★ **Q1:** What is the primary object? Define it using OOUX template (Object, Relationships, CTAs, Attributes).
★ **Q2:** What tabs exist? What triggers each tab to load? Any tabs conditional?
★ **Q3:** What does the hero/header show? Status, name, key metadata, primary action.
★ **Q4:** What is the state-action matrix? (every state → visual + actions + disabled + hidden)
★ **Q5:** What data from OTHER pages is visible here? (cross-page navigation links)

Q6: What does the sidebar or right column show? (fixed metadata while main content scrolls)
Q7: What is the activity timeline? (vertical line + dots, expandable events)
Q8: What actions live in the (...) menu vs primary buttons?
Q9: What compound states exist? (active + nearing limit + approaching expiry)
Q10: What does this page look like when the entity is in a terminal state? (archived, void, ended)
Q11: What breadcrumb trail? Where does "Back" go?
Q12: What data ripples to this page from other entities? (e.g., creating a subscription → new row in customer's subscriptions tab)

---

## Bank 4: Dialogs (8 Questions)

★ **Q1:** Is this the right container? (≤2 inputs = modal. More = drawer or page.)
★ **Q2:** What is the friction level? (0-3 per the friction ladder)
★ **Q3:** What specific impact should be previewed? (concrete numbers, not vague warnings)

Q4: What does the confirm button say? (action verb, not "Yes" or "OK")
Q5: Does the user need to type something to confirm? (Level 3 only)
Q6: What downstream effects should be listed? (cascade: "42 subscriptions will be affected")
Q7: What happens if the action fails? (error state within dialog, not just a toast)
Q8: Can this dialog appear from multiple places? (same dialog reused or context-specific?)

---

## Bank 5: Wizards (8 Questions)

★ **Q1:** How many steps? Can each step validate independently?
★ **Q2:** Can the user go back to previous steps? Is data preserved?
★ **Q3:** Does the wizard auto-save progress? Can user return later?

Q4: What does the step indicator show? (step names, not numbers)
Q5: Can steps be skipped? Which are optional?
Q6: What does the review/confirmation step show? (summary of all inputs before final submit)
Q7: What happens if the user abandons mid-wizard?
Q8: What's the success state after completion? (summary + link to created entity)

---

## Bank 6: Drawers (6 Questions)

★ **Q1:** Width — 480px (default) or 640px (complex forms)?
★ **Q2:** Does the user need to reference background content? (that's why it's a drawer, not a modal)

Q3: Sticky footer with actions? Or actions at top?
Q4: Does content scroll independently from the page?
Q5: Close on Escape? Close on outside click? (not if unsaved changes)
Q6: Can this drawer open another drawer? (avoid — use page navigation instead)

---

## Bank 7: Charts & Dashboards (8 Questions)

★ **Q1:** What question does this chart answer? (one chart = one question)
★ **Q2:** What time range is default? Can user change it?
★ **Q3:** What does this look like with zero data? (no chart, helpful message + CTA)

Q4: What metrics are hero-sized (36px+)? Max 4 hero metrics.
Q5: Does each number have context? (comparison, trend arrow, threshold, period)
Q6: What's the drill-down path? (click metric → filtered list)
Q7: What anomalies should visually stand out? (past due, failing, expiring)
Q8: Is this real-time or periodic? How fresh is the data? Show "Updated X ago"?

---

## Bank 8: Empty / Error / Loading States (8 Questions)

★ **Q1:** Is this a first-time empty (no entities ever) or filtered empty (entities exist, filters exclude all)?
★ **Q2:** What's the single most helpful CTA for empty state? ("Create your first X")
★ **Q3:** For error state: what happened, why, and what can the user do?

Q4: Loading: skeleton that matches the final layout? Or spinner? (skeleton always for tables/cards)
Q5: Partial load: what if some data loads but some fails? (show what loaded + error banner for failed)
Q6: Slow load (>3s): show progress indicator?
Q7: Retry: automatic or user-initiated? (user-initiated button for explicit control)
Q8: Empty state illustration or just text? (text + CTA is sufficient for B2B; illustrations optional)

---

## Bank 9: Edge Case Stress Test (Run AFTER Primary Bank)

★ **Q1:** What if the entity name is 150 characters long? Does the layout break?
★ **Q2:** What if there are 0 items? 1 item? 10,000 items?
★ **Q3:** What if two users edit the same entity simultaneously? (optimistic locking? last-write-wins?)
★ **Q4:** What if the user's session expires during this flow?
★ **Q5:** What if the user double-clicks a submit button?

Q6: What if content is in a non-Latin script? (Arabic RTL, Japanese characters)
Q7: What if the user opens this in multiple tabs?
Q8: What if the API returns slowly (>5s)?
Q9: What if the user navigates away mid-action? (unsaved changes)
Q10: What browser back/forward button behavior is expected?
