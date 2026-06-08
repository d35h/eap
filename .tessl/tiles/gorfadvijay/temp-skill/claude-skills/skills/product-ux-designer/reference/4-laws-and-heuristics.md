# UX Laws, Heuristics, and Audit Checklists

> The WHY behind every design rule. Use for quality reviews, justifying decisions, or diagnosing why something "feels off."

## Table of Contents
1. [27 Laws of UX — B2B Applied](#1-27-laws-of-ux)
2. [Nielsen's 10 Heuristics Audit](#2-nielsens-10-heuristics-audit)
3. [Forcing Functions](#3-forcing-functions)

---

## 1. 27 Laws of UX

Laws marked **[TOP 10]** are most impactful for B2B applications.

### Perception

| Law | B2B Application |
|-----|----------------|
| **Aesthetic-Usability** **[TOP 10]** | Polished UI earns trust. Users forgive friction when interface looks precise. |
| **Law of Prägnanz** | Reduce visual complexity in dense screens. Clear shapes, consistent patterns. |
| **Von Restorff** **[TOP 10]** | Use visual distinction sparingly for the ONE thing that matters most. Overdue row with red dot stands out in table of gray/green. |

### Decision Making

| Law | B2B Application |
|-----|----------------|
| **Hick's Law** **[TOP 10]** | Limit primary actions per screen. Progressive disclosure for advanced. Show 3 common options, hide 8 behind "More". |
| **Choice Overload** | Group and categorize. Never flat list of 10+ ungrouped options. |
| **Cognitive Bias** | Anchor displays. Show "Recommended" on mid-tier. Show higher tier first to anchor. |
| **Occam's Razor** | Simplest design that solves the problem. Remove every element that doesn't serve the user's task. |

### Memory

| Law | B2B Application |
|-----|----------------|
| **Miller's Law** **[TOP 10]** | Max 7±2 items in any group. Nav: 7 top-level items. List groups: collapse after 5. |
| **Chunking** | Group related fields. Section dense pages. Visual separators between groups. |
| **Working Memory** | Never require remembering data from previous screen. Show context inline. |
| **Cognitive Load** **[TOP 10]** | Reduce intrinsic (simplify), eliminate extraneous (remove noise), optimize germane (teach through patterns). |
| **Mental Model** **[TOP 10]** | Match user's existing model from established tools. "Invoice" not "Bill". Status names match what admins expect. |

### Visual Grouping (Gestalt)

| Law | B2B Application |
|-----|----------------|
| **Common Region** **[TOP 10]** | Cards, sections, bounded areas = groups. Two-tone backgrounds create regions without borders. |
| **Proximity** | Space related items tight (gap-2), separate groups loose (gap-6). Mislabeled spacing = "feels off". |
| **Similarity** | Same-type elements look the same. All IDs monospace. All destructive buttons red outline. All primary CTAs filled. |
| **Uniform Connectedness** | Lines, backgrounds, shared containers show relationships. Timeline connecting events. Breadcrumb showing hierarchy. |

### Behavioral

| Law | B2B Application |
|-----|----------------|
| **Doherty Threshold** **[TOP 10]** | Every interaction <400ms. Optimistic UI, skeleton screens. Never blank screen. |
| **Fitts's Law** **[TOP 10]** | Primary actions: large, close to user. Destructive: small, inside dropdown, needs confirmation. |
| **Flow** | Don't interrupt multi-step tasks. No pop-ups for non-critical info. Auto-save progress. |
| **Goal-Gradient** | Show progress in multi-step flows. "3 of 5 steps." Progress bars. Checklist items checking off. |
| **Paradox of Active User** **[TOP 10]** | Users never read docs. Inline help, smart defaults, example values. Every field has a tooltip. |

### Prioritization

| Law | B2B Application |
|-----|----------------|
| **Pareto (80/20)** | Design for 80% case first. Common actions front-and-center. Rare behind disclosure. |
| **Parkinson's Law** | Constrain inputs. Dropdown with 4 options, not freetext. Smart defaults. |
| **Selective Attention** | Remove distractions from task-focused screens. Creation overlays remove nav chrome. |

### Recall

| Law | B2B Application |
|-----|----------------|
| **Serial Position** | Most important at top AND bottom. Middle gets skimmed. Hero metric at top, actions at bottom. |
| **Peak-End Rule** | Design the best moment AND the last moment deliberately. Success state is a trust moment. |
| **Zeigarnik** | Surface incomplete work. "2 drafts", "5 past due" badges. Setup progress. |

### Additional

| Law | B2B Application |
|-----|----------------|
| **Jakob's Law** | Users expect your product to work like other products they know. Follow established conventions. Deviate only with clear reason. |
| **Postel's Law** | Accept flexible input, output strict format. Accept "$19.99" and "1999" — display "$19.99". |
| **Tesler's Law** | Some complexity is irreducible. Don't hide it — manage it. Complex config IS the feature. |

---

## 2. Nielsen's 10 Heuristics Audit

Use YES/NO questions when reviewing any screen. A "NO" = issue to fix.

### H1: Visibility of System Status
- [ ] Every action shows immediate visual feedback?
- [ ] Loading states for all async operations?
- [ ] User can tell current entity state? (status indicator visible)
- [ ] Clear indicator for test vs. live environment?
- [ ] Save operations show success?
- [ ] Background processes communicated?
- [ ] Breadcrumb/title reflects current location?

### H2: Match System and Real World
- [ ] Uses terminology the user already knows?
- [ ] Statuses named intuitively? (not internal codes)
- [ ] Information in natural order? (not alphabetical or DB order)
- [ ] Metaphors match real-world analogs?

### H3: User Control and Freedom
- [ ] Can user undo actions?
- [ ] Can user go back? Cancel? Escape?
- [ ] Clear exit from any state?
- [ ] No irreversible actions without confirmation?

### H4: Consistency and Standards
- [ ] Same patterns for same interactions throughout?
- [ ] Consistent terminology? (same word for same concept everywhere)
- [ ] Platform conventions followed? (tables, forms, nav)
- [ ] Error styling consistent?

### H5: Error Prevention
- [ ] Destructive actions guarded? (confirmation dialogs)
- [ ] Inputs validated inline before submit?
- [ ] Smart defaults prevent invalid configurations?
- [ ] Disabling buttons when action is invalid? (with tooltip explaining why)

### H6: Recognition Over Recall
- [ ] Everything needed is visible or easily retrievable?
- [ ] No hidden features critical to the task?
- [ ] Context shown inline? (related entity names, not just IDs)

### H7: Flexibility and Efficiency
- [ ] Expert shortcuts? (keyboard, bulk actions)
- [ ] Smart defaults for experienced users?
- [ ] Customizable views? (column picker, saved filters)

### H8: Aesthetic and Minimalist Design
- [ ] Every element earns its space?
- [ ] No visual noise irrelevant to user's task?
- [ ] Visual hierarchy clear? (one primary, secondary, tertiary level)

### H9: Error Recovery
- [ ] Error messages human-readable?
- [ ] Errors explain what happened AND what to do?
- [ ] Errors mapped to specific fields (not generic)?
- [ ] Form input preserved after error?

### H10: Help and Documentation
- [ ] Contextual help available? (tooltips, help text)
- [ ] Complex fields have inline explanations?
- [ ] Empty states guide the user?

---

## 3. Forcing Functions

When stuck on a design decision, use these prompts:

| Prompt | What It Forces |
|--------|---------------|
| "How does [known competitor] handle this?" | Reference-based decision |
| "What if we had to ship in 48 hours?" | Simplification |
| "What if we can't change this for 2 years?" | Long-term thinking |
| "What would a power user who sees this 50x/day want?" | Expert efficiency |
| "What would a first-time user expect?" | Discoverability |
| "What's the worst thing that could happen here?" | Error path design |
| "What would make a CFO trust this number?" | Data confidence |
