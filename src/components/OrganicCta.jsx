import { useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';

// A shape that is never quite still: it breathes through four asymmetric radii
// on a long loop, and leans toward the pointer on approach while the morph
// quickens. Two silhouettes off the same motion - a disc where a call to action
// is the whole point of the screen, an organic slab everywhere else.
//
// The lean is written to a custom property rather than to style.transform. Set
// the transform directly and it overrides the CSS transition, so the follow
// becomes instant and the release snaps back with no easing.
const STRENGTH = 0.24;
const MAX_DISC = 26;
const MAX_SLAB = 10; // a slab sits in a row of other things; it must not barge

export default function OrganicCta({
  to,
  onClick,
  type,
  disabled,
  variant = 'slab',
  className = '',
  children,
}) {
  const ref = useRef(null);
  const max = variant === 'disc' ? MAX_DISC : MAX_SLAB;

  const lean = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const clamp = (v) => Math.max(-max, Math.min(max, v));
    el.style.setProperty('--mx', `${clamp((e.clientX - r.left - r.width / 2) * STRENGTH)}px`);
    el.style.setProperty('--my', `${clamp((e.clientY - r.top - r.height / 2) * STRENGTH)}px`);
  }, [max]);

  const rest = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--mx', '0px');
    el.style.setProperty('--my', '0px');
  }, []);

  const inner = (
    <>
      <span className="org-cta__shape" aria-hidden="true" />
      <span className="org-cta__label">{children}</span>
    </>
  );

  const shared = {
    ref,
    className: `org-cta org-cta--${variant} ${className}`.trim(),
    onPointerMove: lean,
    onPointerLeave: rest,
    onPointerCancel: rest,
  };

  if (to) return <Link to={to} {...shared} onClick={onClick}>{inner}</Link>;
  return (
    <button type={type || 'button'} disabled={disabled} onClick={onClick} {...shared}>
      {inner}
    </button>
  );
}
