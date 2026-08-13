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
// How hard the shape is pulled toward the pointer. A slab is a button among
// other buttons and a lean it cannot justify reads as a jump, so it barely
// moves; the disc is a statement on its own and can afford more.
const STRENGTH = { disc: 0.16, slab: 0.07 };
const MAX = { disc: 14, slab: 4 };

export default function OrganicCta({
  to,
  onClick,
  type,
  disabled,
  variant = 'slab',
  tone = 'solid',
  className = '',
  children,
}) {
  const ref = useRef(null);
  const max = MAX[variant] ?? MAX.slab;
  const strength = STRENGTH[variant] ?? STRENGTH.slab;

  const lean = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const clamp = (v) => Math.max(-max, Math.min(max, v));
    el.style.setProperty('--mx', `${clamp((e.clientX - r.left - r.width / 2) * strength)}px`);
    el.style.setProperty('--my', `${clamp((e.clientY - r.top - r.height / 2) * strength)}px`);
  }, [max, strength]);

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
    className: `org-cta org-cta--${variant} org-cta--${tone} ${className}`.trim(),
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
