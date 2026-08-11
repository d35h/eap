# Intro counter — design

An entry overlay for the landing page: a full-bleed dark panel with a large
percentage that counts up, then lifts away to reveal the page. Shown once per
session, on `/` only.

## Why the counter is driven by real signals

The site is a Vite SPA. By the time React mounts, the JS bundle is already
parsed — there is no download left to report, so a naive counter would be pure
theatre timed to a `setInterval`.

What genuinely is not ready at mount: the three webfonts (Cormorant Garamond,
Inter, JetBrains Mono) and the jury photographs. So the counter tracks
`document.fonts.ready` and `window.load`, easing toward 90% and snapping to 100
when both resolve.

Two bounds keep it honest in both directions:

- **Floor, 1200 ms** — on a warm cache both signals resolve almost instantly and
  the panel would flash. The counter always takes at least this long.
- **Ceiling, 2500 ms** — on a slow connection the signals may never arrive in
  reasonable time. At the ceiling the overlay leaves regardless.

## Components

| Unit | Responsibility |
| --- | --- |
| `src/lib/introProgress.js` | Pure. Given elapsed ms, the ready flags and the bounds, returns the integer to display and whether the intro should exit. No DOM, no timers — this is the unit under test. |
| `src/components/Intro.jsx` | Owns the rAF loop, the ready-signal subscriptions, the session gate and the markup. Calls into `introProgress` for every frame's numbers. |
| `src/styles.css` | The panel, the numeral, and the lift-away transition. |
| `src/App.jsx` | Mounts `<Intro />` above `<Header />` so the panel covers the fixed header too. |

`introProgress.js` is deliberately free of side effects so the timing rules —
the part with real edge cases — are testable without a DOM.

## Behaviour

**Gate.** `sessionStorage['eap-intro-seen']`. Absent → play, then set it.
Present → render nothing. Scoped to `pathname === '/'`, so deep links to
`/apply` never wait.

**Progress.** `eased = 1 - (1 - t)^3` over the floor duration, mapped to 0–90.
On both signals resolving, the remaining distance to 100 closes over 220 ms.
Cubic easing means the number decelerates rather than marching linearly, which
is what makes it read as loading rather than as a timer.

**Exit.** Panel translates to `-100%` over 900 ms on
`cubic-bezier(0.76, 0, 0.24, 1)`. The node unmounts on `transitionend`.

**Numerals.** `--font-display` in `--accent`, matching `04` / `100%` in the
manifesto and the hero countdown. `font-variant-numeric: tabular-nums`, without
which the number jitters as digits change width. Bottom-right,
`clamp(4rem, 12vw, 11rem)`.

## Edge cases

- **`prefers-reduced-motion: reduce`** — the intro does not play at all. The
  media query is read in JS, not just CSS, so the overlay never mounts.
- **Skip** — any click or keypress exits immediately.
- **Screen readers** — `role="progressbar"` with `aria-valuenow`/`min`/`max`.
  The node is removed from the DOM after exit; focus is never moved, so keyboard
  users are not dropped into the overlay.
- **LCP** — page content stays in the document throughout; the panel only covers
  it. Any splash costs something here, which is the reason for the session gate
  and the hard ceiling.

## Testing

`introProgress.js` gets unit tests (vitest, node env, no jsdom required):
the floor holds, the ceiling forces exit, the value never exceeds 100 or moves
backwards, ready-before-floor still waits, reduced-motion reports immediate exit.

The component is verified visually with headless-Chrome CDP frame capture, the
same approach used for the rest of this site's UI work. jsdom and
testing-library are not in the project and are not worth adding for one
component.

## Decisions taken

- Ceiling of 2500 ms over something longer — the site's job is to get artists
  into the application form.
- Counter bottom-right rather than centred — centred reads as the more obvious
  version of this effect.
