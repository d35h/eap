import { useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';

// A disc that is never quite a disc. It breathes through four organic radii on a
// long loop, so it is alive before you touch it; on approach it leans toward the
// pointer and the morph quickens.
//
// The lean is written to a custom property rather than to style.transform. Set
// the transform directly and it overrides the CSS transition, so the follow
// becomes instant and the release snaps back with no easing - which is what the
// reference implementation did.
const STRENGTH = 0.24;
const MAX = 26;

export default function OrganicCta({ to, children, className = '' }) {
  const ref = useRef(null);

  const lean = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const clamp = (v) => Math.max(-MAX, Math.min(MAX, v));
    el.style.setProperty('--mx', `${clamp((e.clientX - r.left - r.width / 2) * STRENGTH)}px`);
    el.style.setProperty('--my', `${clamp((e.clientY - r.top - r.height / 2) * STRENGTH)}px`);
  }, []);

  const rest = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--mx', '0px');
    el.style.setProperty('--my', '0px');
  }, []);

  return (
    <Link
      to={to}
      ref={ref}
      className={`org-cta ${className}`.trim()}
      onPointerMove={lean}
      onPointerLeave={rest}
      onPointerCancel={rest}
    >
      <span className="org-cta__shape" aria-hidden="true" />
      <span className="org-cta__label">
        {children}
        {' '}
        <span className="org-cta__arrow" aria-hidden="true">&#8599;</span>
      </span>
    </Link>
  );
}
