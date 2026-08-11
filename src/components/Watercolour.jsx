/**
 * Diluted pigment spreading through water.
 *
 * Radial gradients read as airbrush: their edges are perfectly smooth and the
 * density falls off evenly. Watercolour does neither - the edge is ragged where
 * the wash has crept along the paper, and pigment settles darker at that edge
 * than in the middle. This gets both by pushing soft shapes through a
 * turbulence displacement, then laying a second, tighter copy over the first so
 * the rims accumulate.
 */
export default function Watercolour({ className = '', seed = 7 }) {
  const f = (n) => `wc-${seed}-${n}`;
  return (
    <svg
      className={`wc ${className}`}
      viewBox="0 0 1200 900"
      preserveAspectRatio="xMaxYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Large, slow noise: the wash creeps in centimetres, not millimetres. */}
        <filter id={f('bleed')} x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.006 0.009" numOctaves="5" seed={seed} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="260" xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur stdDeviation="10" />
        </filter>
        {/* A tighter pass for the rim, where pigment dries darkest. */}
        <filter id={f('rim')} x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.014 0.018" numOctaves="5" seed={seed + 3} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="150" xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur stdDeviation="5" />
        </filter>
        {/* Paper grain, so the wash sits in the sheet rather than on the screen. */}
        <filter id={f('paper')}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>

        <radialGradient id={f('g1')} cx="50%" cy="50%">
          <stop offset="0%" stopColor="#8fd0e6" stopOpacity="0.8" />
          <stop offset="70%" stopColor="#b5e0ef" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#e8f6fb" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={f('g2')} cx="50%" cy="50%">
          <stop offset="0%" stopColor="#63b6d6" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#a8dbea" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* The body of the wash. */}
      <g filter={`url(#${f('bleed')})`} className="wc__body">
        <ellipse cx="1010" cy="640" rx="330" ry="260" fill={`url(#${f('g1')})`} />
        <ellipse cx="1150" cy="330" rx="230" ry="200" fill={`url(#${f('g1')})`} />
        <ellipse cx="820" cy="820" rx="260" ry="180" fill={`url(#${f('g2')})`} />
      </g>

      {/* Rims: the same shapes, smaller and sharper, so edges read as sediment. */}
      <g filter={`url(#${f('rim')})`} className="wc__rim" opacity="0.75">
        <ellipse cx="1010" cy="640" rx="250" ry="190" fill="none" stroke="#8cc6dd" strokeWidth="16" strokeOpacity="0.55" />
        <ellipse cx="1140" cy="345" rx="165" ry="140" fill="none" stroke="#a8dbea" strokeWidth="12" strokeOpacity="0.45" />
      </g>

      <rect width="1200" height="900" filter={`url(#${f('paper')})`} opacity="0.09" />
    </svg>
  );
}
