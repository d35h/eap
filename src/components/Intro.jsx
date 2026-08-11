import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { introFrame, prefersReducedMotion, CEILING_MS } from '../lib/introProgress.js';

const SEEN_KEY = 'eap-intro-seen';

// Private browsing can make sessionStorage throw on access, which must not take
// the landing page down with it - on any doubt, skip the intro.
function alreadySeen() {
  try {
    return Boolean(sessionStorage.getItem(SEEN_KEY));
  } catch {
    return true;
  }
}

function shouldPlay(pathname) {
  return pathname === '/' && !prefersReducedMotion() && !alreadySeen();
}

export default function Intro() {
  const { pathname } = useLocation();
  // Decided once, at mount: navigating back to "/" later must not replay it.
  const [playing, setPlaying] = useState(() => shouldPlay(pathname));
  const [value, setValue] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const panel = useRef(null);

  useEffect(() => {
    if (!playing) return undefined;
    try {
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* nothing to do - the intro simply replays next visit */
    }

    const start = performance.now();
    let readyAt = null;
    let waiting = 2; // fonts + window load
    let raf = 0;

    const arrive = () => {
      waiting -= 1;
      if (waiting === 0 && readyAt === null) readyAt = performance.now() - start;
    };

    if (document.fonts?.ready) document.fonts.ready.then(arrive, arrive);
    else arrive();

    if (document.readyState === 'complete') arrive();
    else window.addEventListener('load', arrive, { once: true });

    const tick = () => {
      const { value: next, done } = introFrame({ elapsed: performance.now() - start, readyAt });
      setValue(next);
      if (done) setLeaving(true);
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // Let anyone who does not want to watch this get past it.
    const skip = () => {
      readyAt = 0;
      setValue(100);
      setLeaving(true);
    };
    window.addEventListener('pointerdown', skip);
    window.addEventListener('keydown', skip);

    // Exiting otherwise depends entirely on the rAF loop. If frames never come
    // the panel would cover the site forever, so this timer - which does not
    // need rAF - is the backstop against that.
    const deadline = setTimeout(() => {
      setValue(100);
      setLeaving(true);
    }, CEILING_MS + 300);

    // The page must not scroll underneath the panel.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(deadline);
      window.removeEventListener('load', arrive);
      window.removeEventListener('pointerdown', skip);
      window.removeEventListener('keydown', skip);
      document.body.style.overflow = prevOverflow;
    };
  }, [playing]);

  // Unmount after the panel has lifted. The timeout is the safety net for the
  // cases where transitionend never fires (reduced motion, a backgrounded tab).
  useEffect(() => {
    if (!leaving) return undefined;
    const t = setTimeout(() => setPlaying(false), 1100);
    return () => clearTimeout(t);
  }, [leaving]);

  if (!playing) return null;

  return (
    <div
      ref={panel}
      className={`intro${leaving ? ' intro--leaving' : ''}`}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Загрузка"
      onTransitionEnd={() => setPlaying(false)}
    >
      <div className="intro__count">
        {value}
        <span className="intro__pct">%</span>
      </div>
      <div className="intro__bar" aria-hidden="true">
        <span style={{ transform: `scaleX(${value / 100})` }} />
      </div>
    </div>
  );
}
