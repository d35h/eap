// Timing rules for the landing intro counter, kept free of DOM and timers so
// the edge cases (floor, ceiling, snap) are testable on their own.
//
// The counter reports two different things stitched together:
//   0 → 90   an eased ramp over FLOOR_MS, standing in for work we cannot measure
//  90 → 100  the snap, run once the fonts and window load have both resolved
//
// Progress in a Vite SPA is largely unobservable — the bundle is parsed before
// React mounts — so the ramp is what makes the number decelerate like loading
// rather than march like a clock, and the snap is the part tied to real events.

export const FLOOR_MS = 1200; // shortest the panel may live, so it cannot flash
export const CEILING_MS = 2500; // longest, so a slow network cannot trap anyone
export const SNAP_MS = 220; // 90 → 100 once the ready signals land
export const RAMP_CEILING = 90;

const clamp01 = (n) => Math.min(Math.max(n, 0), 1);
const easeOutCubic = (t) => 1 - (1 - t) ** 3;

/**
 * One frame of the intro.
 *
 * @param {object}      frame
 * @param {number}      frame.elapsed ms since the intro mounted
 * @param {number|null} frame.readyAt ms at which fonts + load both resolved,
 *                                    or null while either is still pending
 * @returns {{ value: number, done: boolean }} value is an integer 0-100
 */
export function introFrame({ elapsed, readyAt }) {
  if (elapsed >= CEILING_MS) return { value: 100, done: true };

  const ramp = Math.round(RAMP_CEILING * easeOutCubic(clamp01(elapsed / FLOOR_MS)));

  // The snap cannot start before the floor, however early the signals arrive.
  if (readyAt === null) return { value: ramp, done: false };
  const snapStart = Math.max(readyAt, FLOOR_MS);
  if (elapsed < snapStart) return { value: ramp, done: false };

  const snapped = clamp01((elapsed - snapStart) / SNAP_MS);
  const value = Math.round(RAMP_CEILING + (100 - RAMP_CEILING) * snapped);
  return { value, done: snapped >= 1 };
}

/** The intro is skipped outright for readers who have asked for less motion. */
export function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
