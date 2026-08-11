import { describe, it, expect } from 'vitest';
import { introFrame, FLOOR_MS, CEILING_MS, SNAP_MS } from './introProgress.js';

// Shorthand: a frame at `elapsed` ms with both readiness signals still pending.
const pending = (elapsed) => introFrame({ elapsed, readyAt: null });
const ready = (elapsed, readyAt) => introFrame({ elapsed, readyAt });

describe('introFrame', () => {
  it('starts at 0 and never reports exit on the first frame', () => {
    expect(pending(0)).toEqual({ value: 0, done: false });
  });

  it('holds under 90 while the ready signals are pending', () => {
    // The eased ramp is reserved for real progress; the last 10 belongs to the snap.
    for (const t of [100, 400, 800, FLOOR_MS, FLOOR_MS * 2]) {
      expect(pending(t).value).toBeLessThanOrEqual(90);
    }
  });

  it('never moves backwards', () => {
    let prev = -1;
    for (let t = 0; t <= CEILING_MS; t += 16) {
      const { value } = pending(t);
      expect(value).toBeGreaterThanOrEqual(prev);
      prev = value;
    }
  });

  it('decelerates - the first half covers more ground than the second', () => {
    const quarter = pending(FLOOR_MS * 0.25).value;
    const half = pending(FLOOR_MS * 0.5).value;
    const threeQuarters = pending(FLOOR_MS * 0.75).value;
    expect(half - quarter).toBeGreaterThan(threeQuarters - half);
  });

  it('holds the floor even when everything is ready immediately', () => {
    // Warm cache: signals land at 0 ms. Without the floor the panel would flash.
    expect(ready(50, 0).done).toBe(false);
    expect(ready(FLOOR_MS - 1, 0).done).toBe(false);
  });

  it('reaches exactly 100 and exits once the snap completes after the floor', () => {
    const at = FLOOR_MS + SNAP_MS;
    expect(ready(at, 0)).toEqual({ value: 100, done: true });
  });

  it('snaps from the ramp to 100 rather than jumping instantly', () => {
    const mid = ready(FLOOR_MS + SNAP_MS / 2, FLOOR_MS);
    expect(mid.value).toBeGreaterThan(90);
    expect(mid.value).toBeLessThan(100);
    expect(mid.done).toBe(false);
  });

  it('exits at the ceiling even if the signals never arrive', () => {
    const { value, done } = pending(CEILING_MS);
    expect(done).toBe(true);
    expect(value).toBe(100);
  });

  it('never exceeds 100 past the ceiling', () => {
    expect(pending(CEILING_MS * 3).value).toBe(100);
  });

  it('treats a signal arriving after the floor as the start of the snap', () => {
    const readyAt = FLOOR_MS + 500;
    expect(ready(readyAt, readyAt).done).toBe(false);
    expect(ready(readyAt + SNAP_MS, readyAt)).toEqual({ value: 100, done: true });
  });
});
