import { useState, useEffect } from 'react';
import { submissionsOpen } from './cycleRepo.js';

// Shared, tri-state submissions status so the header, hero and apply page all
// agree and fetch it once. Returns:
//   undefined → still loading (render a neutral placeholder, never a guess)
//   true      → open
//   false     → closed
// `cached` makes it synchronous after the first resolve (no flash on SPA nav);
// a full reload re-checks, briefly showing the loading state instead of a wrong one.
let cached;
let inflight;

export function useSubmissionsOpen() {
  const [state, setState] = useState(cached);
  useEffect(() => {
    if (cached !== undefined) {
      if (state !== cached) setState(cached);
      return;
    }
    let alive = true;
    inflight = inflight || submissionsOpen();
    inflight.then((open) => {
      cached = open;
      inflight = null;
      if (alive) setState(open);
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return state;
}
