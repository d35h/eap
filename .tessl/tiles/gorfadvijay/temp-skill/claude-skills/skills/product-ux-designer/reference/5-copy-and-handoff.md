# Copy Rules and Developer Handoff

> The words users see and the specs developers need.

## Table of Contents
1. [Microcopy Rules](#1-microcopy-rules)
2. [Error Messages](#2-error-messages)
3. [Empty States](#3-empty-states)
4. [Confirmation Dialogs](#4-confirmation-dialogs)
5. [Developer Handoff Template](#5-developer-handoff-template)

---

## 1. Microcopy Rules

### Buttons
Action verb + object. The button tells the user what it does.

| Correct | Wrong |
|---------|-------|
| "Create plan" | "Submit" |
| "Void invoice" | "OK" |
| "Add charge" | "Confirm" |
| "Save changes" | "Done" |

**Banned labels:** "Submit", "OK", "Confirm", "Yes/No", "Click here", "Process", "Go". "Continue" only in multi-step wizards.

**Destructive buttons:** Red outline. Verb names the destruction: "Void invoice", "Cancel subscription", "Delete product". Never just "Delete" when the object is ambiguous.

**Loading state:** "{Verb}ing..." with spinner. "Creating..." never "Loading..." or "Please wait..."

### Case
**Sentence case everywhere.** Not Title Case, not ALL CAPS.

| Correct | Wrong |
|---------|-------|
| "Create plan" | "Create Plan" |
| "Credit grants" (tab) | "Credit Grants" |

**Exception:** Table column headers use uppercase 11px letter-spaced (visual treatment, not a case rule).

### Labels
Noun phrase, no verb. "Plan name" not "Enter plan name". No colon above fields. Required: `*` after label. Optional: "(optional)" suffix in muted text.

### Placeholders
Example data, not instructions.

| Field | Correct | Wrong |
|-------|---------|-------|
| Email | "jane@example.com" | "Enter your email" |
| Customer | "Acme Corp" | "Enter name" |
| Slug | "api-calls" | "Enter a slug" |
| Amount | "49.00" | "Enter amount" |
| Search | "Search customers..." | "Type to search" |

### Help Text
Below field, muted gray. One sentence. States constraint or consequence, never repeats label.
- "Must be unique across this product. Cannot be changed after creation."
- "Amount in cents. 4999 = $49.99."

### Disabled Tooltips
Every disabled element explains WHY. Format: "{Reason} — {what to do}"

| Element | Tooltip |
|---------|---------|
| "Edit" on finalized entity | "Already finalized — editing is no longer available" |
| "Collect" on draft | "Finalize first before collecting" |
| "Publish" on incomplete entity | "Add at least one required item before publishing" |

### Tone
- **Precise:** "Invoice #INV-0042 voided" not "Done!"
- **Confident:** "3 invoices past due" not "It looks like there might be some overdue invoices"
- **Never casual:** No "Oops!", "Uh oh", "Yikes"
- **Never robotic:** No "Error code 422: Unprocessable entity"
- **Never apologetic:** "No results match your filters" not "Sorry, we couldn't find anything"

---

## 2. Error Messages

### Structure: What + Why + What to Do

**Validation (inline, below field, red text):**

| Scenario | Message |
|----------|---------|
| Required empty | "{Field name} is required" |
| Format | "Slug can only contain lowercase letters, numbers, and hyphens" |
| Duplicate | "A {entity} with this slug already exists" |
| Range | "Amount must be between 1 and 10,000,000" |

**Permission (toast, amber):**
- "You don't have permission to void invoices. Contact your organization admin."

**Conflict (toast, red):**
- "This record was updated by someone else. Refresh to see the latest version."

**Server/network (banner, red):**
- "Failed to load data. Check your connection and try again." + [Retry] button

**Rate limit (toast, amber):**
- "Too many requests. Please wait a moment and try again."

---

## 3. Empty States

### Two Types (never mix them)

**Global empty (entity never existed):**
```
+--------------------------------------------------+
|                                                    |
|     [Icon: subtle, not illustration]               |
|                                                    |
|     No products yet                                |
|     Products define what you sell and how           |
|     it's priced. Create your first product          |
|     to get started.                                 |
|                                                    |
|     [+ Create Product]                              |
|                                                    |
+--------------------------------------------------+
```

**Filtered empty (entities exist, filters exclude all):**
```
+--------------------------------------------------+
|                                                    |
|     No results match your filters                  |
|     Try adjusting your search or filters.          |
|                                                    |
|     [Clear filters]                                |
|                                                    |
+--------------------------------------------------+
```

### Rules
- Empty state copy is an invitation, not an apology
- One CTA only — the most helpful next action
- Explain WHAT this entity is and WHY user needs it (for first-time empty)
- For filtered empty: always show "Clear filters" link

---

## 4. Confirmation Dialogs

### Template

```
+--- [Action Verb] [Entity] -----------------------+
|                                                   |
|  [Description of what will happen]                |
|                                                   |
|  [Concrete impact — numbers, names, dates]        |
|  • [Downstream effect 1]                          |
|  • [Downstream effect 2]                          |
|                                                   |
|  [Irreversibility warning if applicable]          |
|                                                   |
|              [Cancel]  [Action Verb Entity]        |
+---------------------------------------------------+
```

### Rules
- Dialog title = action verb + entity name
- Body states consequences with concrete numbers ("42 subscriptions will be affected")
- Primary button repeats the action ("Void invoice", not "Confirm")
- Cancel is always an option — never a single-button dialog
- If Level 3 friction: add type-to-confirm input between body and buttons

---

## 5. Developer Handoff Template

Use when speccing a design for engineering.

### Page/Component: [Name]

**Overview:** One sentence.
**User Story:** As a [role], I want to [action] so that [outcome].

### States

| State | Condition | What Shows |
|-------|-----------|------------|
| Loading | Fetching data | Skeleton matching final layout |
| Empty | 0 items | Empty state CTA |
| Error | API failure | Error banner + retry button |
| Populated | ≥1 item | Full content |
| Partial | Some data loaded, some failed | Loaded content + error banner for failed section |

### Component Spec

For each interactive element:

| Property | Value |
|----------|-------|
| Component | [Button / Input / Select / Table / etc.] |
| States | Default, Hover, Active, Disabled, Loading, Error |
| Trigger | [Click / Blur / Change / Mount] |
| Action | [API call / Navigate / Open modal] |
| Feedback | [Toast / Inline error / Redirect] |
| Keyboard | [Tab order / Enter behavior / Escape behavior] |

### Data Requirements

| Field | API Source | Type | Format | Fallback if null |
|-------|-----------|------|--------|-----------------|
| [field] | `response.field` | string | — | "—" |
| [amount] | `response.amount` | number | Currency (2 decimals) | "$0.00" |
| [date] | `response.createdAt` | ISO date | "Mar 24, 2026" | "—" |

### Edge Cases

1. Entity name is 150 characters → truncate with ellipsis at container width
2. 0 items → show empty state (global type)
3. 10,000 items → cursor pagination, 20/page, server-side sort/filter
4. API slow (>3s) → skeleton shimmer, no spinner replacement
5. API fails → error banner, keep stale data visible if available
6. Session expires → redirect to login, preserve URL for return
7. Double-click submit → disable button on first click, re-enable on response
8. Browser back → preserve filters/pagination state in URL params

### Acceptance Criteria

```
GIVEN [precondition]
WHEN [user action]
THEN [expected result]
AND [verification]
```
