/**
 * A watercolour wash: pigment pooled into the lower-right corner, creeping up
 * and to the left.
 *
 * The thing that makes a wash look painted rather than airbrushed is its edge.
 * Where the water stopped, the boundary is abrupt but ragged, with fine fingers
 * running out along the paper's fibres - and it is darkest right at that line,
 * because pigment collects there as the water dries. Blurred shapes have none
 * of that: their edges are smooth and their density falls away evenly.
 *
 * So each layer here is displaced by turbulence and then had its alpha driven
 * hard through a steep transfer curve. The curve is what converts a soft
 * gradient into a defined edge while leaving the turbulence's irregularity
 * intact. Layers are stacked at different scales so the overlaps read as
 * successive washes.
 */
export default function Watercolour({ className = '', seed = 7 }) {
  const f = (n) => `wc${seed}-${n}`;

  // steepness: how abruptly the layer's edge resolves. Low values stay misty,
  // high values dry to a line.
  const Wash = ({ id, freq, scale, steepness, blur, children }) => (
    <filter id={id} x="-35%" y="-35%" width="170%" height="170%">
      <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves="6" seed={seed} result="n" />
      <feDisplacementMap in="SourceGraphic" in2="n" scale={scale} xChannelSelector="R" yChannelSelector="G" />
      <feGaussianBlur stdDeviation={blur} />
      <feComponentTransfer result="shape">
        <feFuncA type="gamma" amplitude={steepness} exponent="1" offset="-0.12" />
      </feComponentTransfer>
      {/* Granulation: real pigment does not dry evenly, it settles into the
          paper's tooth in fine specks. High-frequency noise, clipped to the
          wash so it only shows where there is pigment, and multiplied in so it
          darkens rather than lightens. */}
      <feTurbulence type="fractalNoise" baseFrequency="0.62" numOctaves="3" seed={seed + 11} result="grain" />
      <feColorMatrix in="grain" type="matrix"
        values="0 0 0 0 0.42  0 0 0 0 0.55  0 0 0 0 0.66  0 0 0 0.35 0" result="grainTinted" />
      <feComposite in="grainTinted" in2="shape" operator="in" result="grainClipped" />
      <feBlend in="shape" in2="grainClipped" mode="multiply" />
      {children}
    </filter>
  );

  return (
    <svg
      className={`wc ${className}`}
      viewBox="0 0 1000 1000"
      preserveAspectRatio="xMaxYMax slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Body of the pool: broad, soft, the palest layer. */}
        <Wash id={f('a')} freq="0.004 0.006" scale="300" steepness="1.5" blur="16" />
        {/* Middle wash: tighter noise, edge starting to resolve. */}
        <Wash id={f('b')} freq="0.009 0.013" scale="200" steepness="2.6" blur="7" />
        {/* Top wash: the dried edge, with the fibres showing. */}
        <Wash id={f('c')} freq="0.02 0.028" scale="120" steepness="4.2" blur="2.5" />

        <filter id={f('paper')}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>

      {/* Palest and largest, reaching furthest up the page. */}
      <g filter={`url(#${f('a')})`} opacity="0.95">
        <ellipse cx="880" cy="880" rx="620" ry="470" fill="#e8f6fb" />
        <ellipse cx="1010" cy="520" rx="330" ry="330" fill="#e8f6fb" />
      </g>

      {/* Second wash, pulled toward the corner. */}
      <g filter={`url(#${f('b')})`} opacity="0.85">
        <ellipse cx="930" cy="930" rx="470" ry="330" fill="#b7e0ef" />
        <ellipse cx="1050" cy="700" rx="240" ry="250" fill="#b7e0ef" />
      </g>

      {/* The dried edge: smallest, densest, and where the pigment settled. */}
      <g filter={`url(#${f('c')})`} opacity="0.72">
        <ellipse cx="960" cy="960" rx="360" ry="230" fill="#8fcde3" />
        <ellipse cx="820" cy="990" rx="230" ry="120" fill="#8fcde3" />
      </g>

      <rect width="1000" height="1000" filter={`url(#${f('paper')})`} opacity="0.05" />
    </svg>
  );
}
