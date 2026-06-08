# Interaction Patterns for B2B Applications

> Tactical rules for HOW each UI component type should behave.

## Table of Contents
1. [Container Decision Tree](#1-container-decision-tree)
2. [Form Patterns](#2-form-patterns)
3. [Table Patterns](#3-table-patterns)
4. [Navigation Patterns](#4-navigation-patterns)
5. [Feedback Patterns](#5-feedback-patterns)
6. [Destructive Action Friction Ladder](#6-destructive-action-friction-ladder)

---

## 1. Container Decision Tree

```
Does the task have its own URL / sub-navigation?
  YES → NEW PAGE
  NO  → continue

Does the task need > 5 fields OR scrolling content?
  YES → Does user need to reference background content?
          YES → DRAWER
          NO  → NEW PAGE
  NO  → continue

Can the user complete this in ≤ 2 inputs?
  YES → MODAL (dialog)
  NO  → Is it editing properties of a selected item?
          YES → INLINE EDIT or DRAWER
          NO  → DRAWER
```

| Container | Criteria | B2B Examples |
|-----------|----------|-------------|
| **Modal** | ≤2 inputs, quick action, blocks background | Confirm delete, rename, create API key |
| **Drawer** | 3-8 fields, user references background | Add entity, edit config, grant rule form |
| **New Page** | Own URL, tabs, bookmarkable, multi-step | Entity detail, settings, wizards |
| **Inline** | Single-field edit, toggle, status change | Edit name in-place, toggle on/off |

**Never use a Modal for:** scrolling content, multi-step wizards (3+ steps), forms with 3+ fields, tasks needing reference data.

**Drawer specs:** 480px default, 640px for complex forms. Slides from right. Background dimmed but visible. Close on Escape / outside click (unless unsaved changes → "Discard changes?" first).

**Modal specs:** 480px max, centered, background non-interactive. Close on Escape. Never nest modals.

---

## 2. Form Patterns

### Validation Timing

| Type | When | Example |
|------|------|---------|
| **Format** | On blur | Email, URL, ID prefix |
| **Required** | On blur (if touched) + on submit | Name, email |
| **Uniqueness** | On blur (async, 500ms debounce) | Slug, external ID |
| **Cross-field** | On submit | End date > start date |
| **Range** | On blur | Rate ≥ 0, quantity > 0 |

- Never validate on every keystroke
- Clear errors when user starts correcting
- Preserve ALL user input on validation failure — never clear the form

### Required vs Optional
- Mark required with `*` after label: `Name *`
- If most fields required, mark optional instead: `Tax ID (optional)`
- Group required first, optional behind "Advanced" toggle

### Layout
- **Single column** for all forms. Exception: paired fields on one line (currency + amount, start + end date, city + state + zip).
- Max 5-6 visible fields before requiring grouping
- Conditional fields: animated height transition (150ms ease-out), no dead space

### Field Grouping

```
+-- Basic Information ----------------------+
|  Name *          [________________]       |
|  Email *         [________________]       |
+-------------------------------------------+

+-- Configuration --------------------------+
|  Type    [dropdown v]                     |
|  (conditional fields based on type)       |
+-------------------------------------------+

> Advanced (collapsed by default)
  External ID, Metadata, Tags
```

### Form Lifecycle
- **Submit label:** Action verb + object: "Create plan", "Add charge", "Update customer". Never "Submit", "Save", "OK".
- **Loading state:** "{Verb}ing..." with spinner. "Creating..." not "Loading..."
- **Success:** Toast (auto-dismiss 4s) + navigate to created entity or close drawer + refetch list.
- **Error:** Field-level for validation, banner for server/network. Never clear form on error.
- **Cancel/navigate away:** "Unsaved changes" dialog only when form is dirty. Track dirty state per field.
- **Keyboard:** Tab order follows visual order. Enter on last field triggers submit. Escape closes drawer/modal.

---

## 3. Table Patterns

### Column Priority
- T1 (always visible): 5-6 columns max. Status, name, primary metric, date.
- T2 (column picker): Created date, secondary metrics, external ID.
- T3 (row detail): Full data on click.

### Defaults
- **Sort:** `createdAt DESC` (newest first) unless a more actionable default exists.
- **Pagination:** Cursor-based, 20 rows/page. "Showing 1-20 of ~1,240". Next/Previous buttons. Never infinite scroll.
- **Search:** Server-side, 300ms debounce, min 2 chars. Hits name + ID + email.

### Row Interaction
- **Row click → navigate** to detail page (for complex objects with own page).
- **Row click → open drawer** (for smaller objects that don't warrant a page).
- **Selection via explicit checkboxes** (left column), not row click.

### Row Actions (three-dot menu)
3-5 actions max: View, Edit, Copy ID, then 1-2 domain-specific. Destructive actions last with red label.

### Empty States (two types)
- **Global empty** (no entities exist): Centered headline + description + primary CTA ("Create your first product").
- **Filtered empty** (entities exist, filters exclude all): "No results match these filters" + "Clear filters" button.
Never show the same empty state for both.

### Loading
- First load: skeleton rows matching column count and approximate widths.
- Subsequent (pagination, filter): keep existing rows at 0.5 opacity + thin progress bar. Never replace table with spinner.

### Bulk Operations
Safe bulk: export (CSV), archive, tag/label. Never bulk: delete, cancel, void. Require confirmation with count: "Archive 47 items?" Limit selection to current page.

---

## 4. Navigation Patterns

### Sidebar
- Maximum 7±2 top-level items (Miller's Law)
- Order by frequency of use, not alphabetical
- Group related items under section headers
- Icons + labels (never icons alone)

### Hierarchy
- Level 1: Main sections (always visible in sidebar)
- Level 2: Sub-pages (visible when parent active)
- Level 3: Tabs within a page (never in nav)

### Breadcrumbs
Use when depth > 2 levels. Format: `Products > Pro Suite > Plans > Pro Monthly`

### Cross-Page Navigation
- Every detail page links to related entities (click customer name → customer detail)
- Every list row navigates to detail (row click or explicit "View" link)
- No dead ends — every page has a next step or back link

---

## 5. Feedback Patterns

| Feedback Type | Component | Duration | Use When |
|---------------|-----------|----------|----------|
| **Success** | Toast (top-right) | Auto-dismiss 4s | Action completed (create, update, delete) |
| **Error (field)** | Inline below field, red text | Persistent until fixed | Validation failure |
| **Error (system)** | Banner at top of section, red | Persistent until dismissed | API failure, permission |
| **Warning** | Banner, amber | Persistent until dismissed | Approaching limit, expiring soon |
| **Info** | Banner, blue | Persistent until dismissed | Environment indicator, feature flag |
| **Loading** | Skeleton / shimmer | Until data loads | Initial page load, tab switch |
| **Background job** | Toast when complete | Auto-dismiss 4s | Report generating, import processing |

**Rules:**
- Never block UI for background operations
- Show progress indicator only if >3 seconds
- Success feedback scope matches action scope (small action = toast, major action = navigation + toast)

---

## 6. Destructive Action Friction Ladder

Inspired by GitLab Pajamas. Match friction to consequence.

### Level 0: No Confirmation
**When:** Action is safe and instantly reversible.
**Examples:** Edit name, toggle feature, reorder list, change filter.
**Pattern:** Direct manipulation. Optimistic UI.

### Level 1: Inline Confirmation
**When:** Low risk, easily reversible, minimal blast radius.
**Examples:** Archive entity with 0 dependencies, remove optional field.
**Pattern:** Button changes to "Undo" for 5 seconds, then commits.

### Level 2: Dialog Confirmation
**When:** Medium risk, hard to reverse, affects user or downstream entities.
**Examples:** Cancel subscription, void invoice, disable plan, remove team member.
**Pattern:**

```
+--- Void Invoice #INV-0042 ----------------------+
|                                                   |
|  This invoice will be permanently voided.         |
|                                                   |
|  Amount: $4,892.50                                |
|  Customer: Acme Corp                              |
|  Status: Issued → Void                            |
|                                                   |
|  This action cannot be undone. The customer will   |
|  be notified via email.                           |
|                                                   |
|              [Cancel]  [Void Invoice]             |
+---------------------------------------------------+
```

Button label repeats the action. Never "Yes" / "OK" / "Confirm".

### Level 3: Type-to-Confirm
**When:** High risk, irreversible, cascade effects, bulk operations.
**Examples:** Delete entity with children, bulk archive, permanent data removal.
**Pattern:**

```
+--- Delete Product "Pro Suite" -------------------+
|                                                   |
|  This will permanently delete:                    |
|  - 3 pricing plans                                |
|  - 8 features                                     |
|  - 42 active subscriptions will be affected       |
|                                                   |
|  Type "Pro Suite" to confirm:                     |
|  [________________________]                       |
|                                                   |
|              [Cancel]  [Delete Product]           |
+---------------------------------------------------+
```
