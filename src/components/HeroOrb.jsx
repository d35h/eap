import { useEffect, useState } from 'react';
import { translations, LANGUAGES } from '../i18n.js';
import { useTranslation } from '../hooks/useTranslation.jsx';

const HOLD_MS = 3000;

// The orb cycles its line through every locale, the way the reference alternates
// its English and Vietnamese taglines - the platform is multilingual, and the
// first screen says so before you read a word of it.
function taglines(active) {
  const codes = [active, ...LANGUAGES.map((l) => l.code).filter((c) => c !== active)];
  return codes.map((c) => translations[c]?.hero?.orbTagline).filter(Boolean);
}

const reduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function HeroOrb() {
  const { lang, t } = useTranslation();
  const lines = taglines(lang);
  const [step, setStep] = useState(0);
  const [still] = useState(reduced);

  useEffect(() => {
    if (still || lines.length < 2) return undefined;
    const id = setInterval(() => setStep((s) => s + 1), HOLD_MS);
    return () => clearInterval(id);
  }, [still, lines.length]);

  // Re-mounting on `lang` would restart mid-cycle; resetting the step is enough.
  useEffect(() => setStep(0), [lang]);

  const current = lines[step % lines.length];
  const previous = step === 0 ? null : lines[(step - 1) % lines.length];

  return (
    <section className={`orb${still ? ' orb--still' : ''}`} aria-label={t('hero.meta1')}>
      <div className="orb__field" aria-hidden="true">
        <span className="orb__blob orb__blob--1" />
        <span className="orb__blob orb__blob--2" />
        <span className="orb__blob orb__blob--3" />
        <span className="orb__sphere" />
        <span className="orb__grain" />
      </div>

      {/* aria-live is deliberately off: a line that rewrites itself every three
          seconds would be read aloud on a loop. The heading below carries it. */}
      <h2 className="orb__line" aria-live="off">
        {previous && (
          <span className="orb__word orb__word--out" key={`out-${step}`}>
            {previous}
          </span>
        )}
        <span className="orb__word orb__word--in" key={`in-${step}`}>
          {current}
        </span>
      </h2>

      <div className="orb__scroll" aria-hidden="true">
        <svg viewBox="0 0 100 100" className="orb__scroll-ring">
          <defs>
            <path id="orb-ring" d="M50,50 m-34,0 a34,34 0 1,1 68,0 a34,34 0 1,1 -68,0" />
          </defs>
          <text>
            <textPath href="#orb-ring" startOffset="0">
              SCROLL DOWN · SCROLL DOWN ·
            </textPath>
          </text>
        </svg>
        <span className="orb__scroll-dot" />
      </div>
    </section>
  );
}
