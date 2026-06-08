# Decision Frameworks for B2B Product Design

> 5 frameworks that cover ~90% of product design decisions. Each solves a different type of decision.

## Table of Contents
1. [OOUX (ORCA)](#framework-1-ooux) — Information Architecture
2. [Job Stories](#framework-2-job-stories) — Workflow Design
3. [State-Action Matrix](#framework-3-state-action-matrix) — State Communication
4. [Progressive Disclosure](#framework-4-progressive-disclosure) — Data Density
5. [High-Stakes Moments](#framework-5-high-stakes-moments) — Trust and Safety
6. [Pre-Mortem](#pre-mortem-template) — Failure Prevention

---

## Framework 1: OOUX — Object-Oriented UX

**Solves:** What goes on this page? What's hidden? What order?

Define the NOUNS first, not the flows. What objects exist? What are their attributes, relationships, and actions? Flows come after.

**The rule:** If two screens show the same object differently without a deliberate reason, that's a design bug.

### The ORCA Method

**O — Objects:** Every "thing" a user interacts with that gets its own page or card.
- Does this object get its own page, or is it nested inside another?
- What's the one-sentence user description?
- Created by user, system, or external event?

**R — Relationships:** How objects connect. Determines navigation and contextual links.
- When viewing Object A, which other objects must be visible or navigable?
- One-to-one, one-to-many, or many-to-many?
- Which relationships are primary (always shown) vs secondary (on demand)?

**C — CTAs (Calls to Action):** What users can DO with each object.
- CRUD actions?
- Which actions change state? (state machine transitions)
- Which are destructive or irreversible? (High-Stakes Moment candidates)
- Which affect other objects? (cascade/ripple effects)

**Per-role CTAs:** In B2B, 4 roles typically share one product:

| Role | Cares About | Typical CTAs |
|------|------------|--------------|
| **Buyer** (VP/Director) | Cost, ROI, contract terms | View invoices, approve changes, download reports |
| **Admin** (Ops) | Configuration, correctness | Create entities, manage lifecycle, configure |
| **User** (IC/Developer) | Access, limits, usage | Check entitlements, view usage, track balance |
| **Finance** (Controller) | Revenue recognition, audit | Export data, reconcile, review |

Tag each CTA with the role(s) that need it. If a CTA serves only Finance, it belongs in Tier 2 or 3.

**A — Attributes:** Prioritize what data to show.

| Tier | Count | Where | What |
|------|-------|-------|------|
| **Glance** | 3-5 | List/table rows, card previews | Status, name, amount, date, key ID |
| **Detail** | 8-12 | Detail page above fold | + relationships, period, method |
| **Advanced** | Rest | Settings, modals, API-only | Metadata, audit log, webhooks |

### OOUX Template

```
OBJECT: [Name]
  One-sentence: "[What a user would call this]"
  Created by: [User | System | External event]
  Gets own page: [Yes/No]

RELATIONSHIPS:
  → [Object] ([parent|child|sibling], [always shown | on demand])

CTAs:                                        ROLE(S)
  [Action verb]: [Description]               [Admin]
  [Action verb]: [Description] (irreversible) [Admin, Finance]

ATTRIBUTES:
  Glance: [field1], [field2], [field3]
  Detail: + [field4], [field5], ...
  Advanced: [field6], [field7], ...
```

---

## Framework 2: Job Stories

**Solves:** What are the different paths through this feature?

Job stories focus on the SITUATION that creates the need, not the persona:

```
When [situation with context],
I want to [motivation],
So I can [expected outcome].
```

The same user in different situations needs completely different workflows. A founder setting up their first product is not the same as an ops lead migrating 50 products from a competitor.

### Rules
1. **Maximum context in the situation.** Bad: "When I want to create a plan..." Better: "When I'm setting up billing for the first time and only have one flat-rate model in mind..."
2. **One story per distinct path**, not per feature. A "Create" feature might have 6 stories.
3. **Include forces — anxieties and motivations.** B2B products carry inherent anxiety (misconfiguring, overbilling, data loss).

### Template

```
WORKFLOW: [Name]
PAGE(S): [Which pages involved]

JOB STORY #1 — [Short label]
When [detailed situation],
I want to [what user wants],
So I can [outcome].

FORCES:
  Anxieties: [What could go wrong? What worries them?]
  Motivations: [Why urgent? What's driving them?]

DESIGN IMPLICATIONS:
  - [Specific UI decision this story drives]
  - [Specific UI decision this story drives]
```

---

## Framework 3: State-Action Matrix

**Solves:** In each object state, what does the user see and do?

Every B2B object has a lifecycle with distinct states. Each state needs explicit decisions:
1. **Visual treatment:** Color, icon, dot, banner
2. **Available actions:** Active buttons/links
3. **Disabled actions:** Grayed out with reason on hover
4. **Hidden actions:** Not shown at all
5. **User emotion:** How does the user feel in this state?
6. **Transition rules:** What causes state change + what user sees during transition

### Matrix Format

```
OBJECT: [Name]
STATES: [list all]

| State | Visual | User Emotion | Available Actions | Disabled (reason) | Hidden |
|-------|--------|-------------|-------------------|-------------------|--------|
| ...   | ...    | ...         | ...               | ...               | ...    |
```

### Design Rules
1. **States are mutually exclusive and collectively exhaustive.** Every object is in exactly one state.
2. **Visual treatment beyond color alone.** Dot + text + banner. Colorblind users manage critical data.
3. **Disabled actions explain WHY.** "Invoice already finalized — editing is no longer available."
4. **Terminal states feel terminal.** Muted, struck-through, visually "done."
5. **Transitions get confirmation.** Show what changes, what can't be undone, downstream effects.

### Compound States
The hardest design problems come from compound states — multiple conditions simultaneously:
- Entity in error state + related entity also in error
- Active + nearing limit + approaching expiry
- Draft + no required children + first-time setup

List every compound state. Design these BEFORE the happy path.

---

## Framework 4: Progressive Disclosure

**Solves:** How much data on screen? When to summarize vs expand?

Show users only what they need at each stage. For B2B products with dense data models, this is survival.

### Three-Tier Model

| Tier | What | Design Patterns |
|------|------|----------------|
| **Tier 1 — Always Visible** | 3-5 things 80% of users need 80% of the time | Primary fields, table columns, hero metrics |
| **Tier 2 — One Click Away** | 8-15 things experienced users need regularly | Expandable sections, tabs, "Advanced" toggle |
| **Tier 3 — Seek and Find** | Everything else (power users, support teams) | Settings pages, metadata panels, audit logs |

### Rules
1. **Tier by frequency of use, not importance.** Tax settings = critical but rarely changed = Tier 3.
2. **Smart defaults reduce Tier 1.** If 90% keep the default, don't show it in Tier 1.
3. **Tier boundaries must be visually obvious.** Clear break between Tier 1 and Tier 2.
4. **Tables get column tiers too.** 5-6 Tier 1 columns, rest in column picker or row detail.

### Conditional Display
Some elements aren't Tier 2 or 3 — they're conditionally visible based on configuration state. These need explicit show/hide rules:

```
| Element | Show When | Hide When |
|---------|-----------|-----------|
```

If your project has a domain file (`domains/*.md`), check it for domain-specific conditional visibility tables.

---

## Framework 5: High-Stakes Moments

**Solves:** How do we treat actions where mistakes have serious consequences?

Any interaction where:
- Data is permanently changed or deleted
- Something becomes irreversible (finalize, publish, void, cancel)
- State changes affect other entities (cascade/ripple)
- An error could cause significant user harm

### The High-Stakes Protocol

**1. Preview impact before confirmation.** Show what will change, in concrete numbers. Not "Are you sure?" but the specific before/after.

**2. Friction ladder** (match friction to risk):

| Level | Friction | Use When | Example |
|-------|----------|----------|---------|
| 0 | None | Safe, instantly reversible | Edit name, toggle, reorder |
| 1 | Inline confirm | Low risk, easily reversible | Archive with 0 dependencies |
| 2 | Dialog | Medium risk, hard to reverse | Cancel subscription, void |
| 3 | Type-to-confirm | High risk, irreversible + cascade | Delete with children, bulk operations |

**3. Show before/after for any change.** Modifications, upgrades, plan changes — always show current state and new state side by side.

**4. Success states are designed moments.** Not just a toast. Show what was done, key details, link to the result. The success screen is a trust-building moment.

**5. Error states include recovery paths.** Not just "Something went wrong." State: what happened, why, and what the user can do about it.

### Identifying High-Stakes Moments

Audit every page and flag actions:

```
PAGE: [Name]
  Regular actions: View, Search, Filter, Navigate
  HIGH-STAKES:
    ⚠️ [Action] ([why it's high-stakes])
       → Friction level: [0-3]
       → Preview: [what to show before confirming]
       → Button label: [action verb, not "Confirm"]
```

---

## Pre-Mortem Template

Run after Step 6, before finalizing decisions.

```
PAGE/FEATURE: [Name]

6 months from now, this failed. What went wrong?

Most likely failure mode:
  [What's the #1 way this design breaks in production?]

Most embarrassing failure mode:
  [What would make us cringe if a customer screenshots it?]

Edge case nobody thought of:
  [What combination of states/data/timing causes chaos?]

Early warning signal:
  [What metric would tell us this is failing before users complain?]

Kill signal:
  [At what point do we redesign rather than patch?]
```
