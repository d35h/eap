# Domain: UnitPay Billing

> Load this file when designing pages for UnitPay. Contains billing-specific patterns, conditional visibility rules, state machines, money display rules, and the UnitPay page doc system.

## Table of Contents
1. [Context Loading Paths](#1-context-loading-paths)
2. [Page Doc System](#2-page-doc-system)
3. [Credit Conditional Visibility](#3-credit-conditional-visibility)
4. [Money Display Rules](#4-money-display-rules)
5. [Billing State Machines](#5-billing-state-machines)
6. [Billing-Specific Design Rules](#6-billing-specific-design-rules)
7. [Competitor Reference Sources](#7-competitor-reference-sources)

---

## 1. Context Loading Paths

When designing a UnitPay page, read these in order:

| What | Where | Why |
|------|-------|-----|
| Page docs (existing) | `docs/pages/{page}/` | spec.md, design.md, flows.md, tests.md, decisions.md, states.md |
| Module docs (backend) | `docs/modules/{module}/` | api.md (endpoints), lifecycle.md (events), schema.md (tables) |
| Product map | `docs/pages/PRODUCT-MAP.md` | Cross-page connections, data ripple effects, navigation graph |
| Page index | `docs/pages/INDEX.md` | All pages, their APIs, doc status |
| Design system | `.impeccable.md` | Colors, typography, component patterns |
| Competitor patterns | `.og/steallikeartist/` | Teardowns, screenshots, steal lists |

### Module → Page Mapping

| Page | Primary Module | Route |
|------|---------------|-------|
| Products | `pricing-packaging` | /products, /products/:id, /products/:id/plans/:planId |
| Customers | `customers` | /customers, /customers/:id |
| Subscriptions | `subscriptions` | /subscriptions, /subscriptions/:id |
| Invoices | `invoices` | /invoices, /invoices/:id |
| Credits | `credits` | /credits |
| Coupons | `coupons` | /coupons |
| Contracts | `contracts` | /contracts, /contracts/:id |

---

## 2. Page Doc System

Every UnitPay page has 6 documentation files. The skill reads existing files and fills gaps.

| File | What It Contains | Skill Produces |
|------|-----------------|----------------|
| `spec.md` | Layout, tabs, data loading, page states, conditional display | Reads for context. Updates if gaps found. |
| `flows.md` | Every user action → API call → state change | Reads for context. |
| `tests.md` | Contract test specs per API | Reads for context. |
| `design.md` | ASCII wireframes, conditional UI rules, Zod schemas | **Produces/updates wireframes with real data and all edge cases.** |
| `decisions.md` | Design decisions with rationale and genealogy | **Primary output. Every interrogator answer → decision row.** |
| `states.md` | State-action matrices, conditional sections, edge cases | **Primary output. Every object state → matrix row.** |

### Output Formats

**decisions.md:**
```markdown
| # | Decision | Answer | Rationale | Genealogy | Lenses |
|---|----------|--------|-----------|-----------|--------|
| D1 | Primary user of Products page | Billing admin configuring pricing | Config surface, not dashboard | Stripe: same | 10x=Y, Position=Y |
```

**states.md:**
```markdown
## State-Action Matrix: [Object Name]

| Status | Visual | User Emotion | Available Actions | Disabled (reason) | Hidden |
|--------|--------|-------------|-------------------|-------------------|--------|

## Conditional Sections

| Section | Shows when | Hides when |
|---------|-----------|------------|

## Edge Cases

| Scenario | What happens | Design decision |
|----------|-------------|-----------------|
```

---

## 3. Credit Conditional Visibility

Credits are CONDITIONAL. Every credit-related UI element is hidden by default. Show only when configured.

| Element | Show When | Hide When |
|---------|-----------|-----------|
| Credits nav item (sidebar) | Org has ≥1 credit currency | No credit currencies |
| Credits tab (Customer detail) | Customer has ≥1 credit account | No credit accounts |
| Credits tab (Subscription detail) | Plan has `pricingModel='credits'` charges OR credit grant rules | Pure dollar plan |
| Credits tab (Product detail) | Any plan under product has credit grants | No credit-configured plans |
| Credit balance card (Customer) | Customer has ≥1 credit account | No credit accounts |
| Credits column (Subscriptions list) | ANY sub in filtered list has credit grants | All dollar-only |
| Credits column (Invoices list) | ANY invoice has `creditApplied > 0` | No credit applications |
| Credit grant step (Plan wizard) | Credit currency exists in org | No credit currencies |
| Credit grants section (Plan detail) | Plan has `credit_grant_rules` | No grant rules |
| Credit deduction line (Invoice totals) | Invoice `creditApplied > 0` | Zero credits applied |
| Lightning icon on MRR | `billingModel='credit'` | Dollar billing |
| Credit cost column (Usage table) | Any charge has `pricingModel='credits'` | Pure dollar charges |
| Auto top-up indicator | `account.autoTopUp !== null` | Omit entirely (no "OFF" state) |

**The absence of credits should be INVISIBLE, not called out.** Never show "No credits configured" — just don't show the credits elements.

---

## 4. Money Display Rules

| Rule | Correct | Wrong |
|------|---------|-------|
| Right-aligned in tables | `$1,999.00` flush right | Flush left |
| Monospace / tabular-nums | `font-variant-numeric: tabular-nums` | Proportional digits |
| Currency symbol always | `$49.00`, `EUR 49.00` | Just `49.00` |
| Two decimals for dollars | `$49.00` | `$49` or `$49.0` |
| Comma at thousands | `$1,234,567.89` | `$1234567.89` |
| Sub-cent rates: 4 decimals | `$0.0015/unit` | `$0.00/unit` |
| Negative: minus + red | `-$26.27` in red | `($26.27)` |
| Zero amounts | `$0.00` | `--` or blank |
| Hero metrics: 36px+ | Large, bold, monospace | Small body text |
| Trend arrows | `$48,200 ↑8%` green | Just the number |
| Credits: integer only | `500 credits` | `500.00 credits` |
| Credits: lightning prefix | `⚡ 500` | `$500` |

### Zero-Decimal Currencies
| Currency | Format |
|----------|--------|
| JPY | `JPY 4,900` (no decimals) |
| USD, EUR, GBP, CAD, AUD | Always 2 decimal places |

### Invoice Totals Pattern
```
Subtotal            $131.34
Discount (20%)       -$26.27     (red)
Tax (8%)              $8.41
Total               $113.48      (bold, larger)
Credits Applied      -$10.00     (only if > 0)  [if credits]
Amount Paid           $0.00
Balance Due         $103.48      (bold, largest, hero)
```

---

## 5. Billing State Machines

### Subscription (7 states, 14 transitions)

| State | Visual | Terminal? |
|-------|--------|-----------|
| pending | Gray dot | No |
| trialing | Blue dot + "Trial ends {date}" | No |
| active | Green dot | No |
| past_due | Red dot + warning banner | No |
| paused | Amber dot | No |
| canceled | Gray dot, muted | Yes |
| ended | Struck-through, gray | Yes |

### Invoice (6 statuses — D47)

| State | Visual | Terminal? |
|-------|--------|-----------|
| draft | Gray dot, muted | No |
| issued | Blue dot | No |
| partially_paid | Amber dot | No |
| paid | Green dot | Yes |
| overdue | Red dot + warning | No |
| void | Struck-through | Yes |

### Plan (5 statuses — D45)

| State | Visual | Terminal? |
|-------|--------|-----------|
| draft | Amber dot | No |
| active | Green dot | No |
| disabled | Gray dot | No |
| archived | Muted, struck-through | Yes |
| migrated | Blue dot + "→ v{N}" | Yes |

### Credit Account (3 states)

| State | Visual | Terminal? |
|-------|--------|-----------|
| ACTIVE | Green dot | No |
| FROZEN | Blue dot + warning | No |
| CLOSED | Gray, muted | Yes |

### Credit Reservation (4 states)

| State | Visual | Terminal? |
|-------|--------|-----------|
| PENDING (HOLD) | Amber dot | No |
| SETTLED | Green dot | Yes |
| RELEASED | Gray dot | Yes |
| EXPIRED | Red dot | Yes |

**Visual pattern for ALL states:** 6px colored dot + colored text label. NOT filled pills. Terminal states feel terminal (muted, struck-through).

---

## 6. Billing-Specific Design Rules

### Entity ID Display
- Prefixed IDs: `cus_`, `org_`, `pln_`, `sub_`, `inv_`, etc.
- Display: monospace, muted color, copy-on-click icon
- Never show full UUID — show prefix + first 8 chars: `sub_01J5K...`

### Status Patterns
- States = dot + text (6px colored dot + colored text label)
- NOT filled pills, NOT badge backgrounds
- Terminal states: muted, struck-through appearance
- Warning states: dot + text + banner with context

### Time Display
- Surface dates, periods, countdowns, expiry everywhere
- Billing period: "Mar 1 – Mar 31, 2026"
- Trial: "Trial ends in 12 days"
- Credit expiry: "Expires Mar 31" or "3 days remaining"
- Timestamps: relative when <7 days ("2 hours ago"), absolute when >7 days ("Mar 15, 2026")

### Data Density
- Stripe-style tables: uppercase 11px letter-spaced headers, hover rows, generous padding
- Two-tone pages: muted background page, white content cards. No card shadows.
- Copy-on-click for all IDs and codes
- Inline docs (tooltips) on every non-obvious field

---

## 7. Competitor Reference Sources

When designing billing pages, check these first:

| Source | Where | What to Steal |
|--------|-------|---------------|
| Stripe Dashboard | `.og/steallikeartist/research/teardowns/` | Table patterns, status dots, form sheets, empty states |
| Orb | `.og/docs/orb/` | Event debugger, billing trace, dimensional pricing |
| Metronome | `.og/docs/metronome/` | Commit drawdown, enterprise contract views |
| Stigg | `.og/docs/stigg/` | Feature matrix builder, Check API playground |
| Lago | `.og/docs/` | Invoice pipeline viewer, credit consumption |
| Sequence | `.og/docs/sequence/` | Subscription timeline, quote-to-cash flow |

**UnitPay's differentiators (push BEYOND competitors):**
- Live credit consumption visualization
- Reservation flow animation (HOLD/SETTLE/RELEASE)
- Predictive credit runway
- Real-time event stream viewer
- Interactive billing pipeline debugger
