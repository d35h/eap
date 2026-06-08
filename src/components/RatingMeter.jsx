import { useState } from 'react';

// A 1–10 rating expressed as a row of segments that fill up to the score, with a
// large numeric readout. Interactive (hover previews, click sets) or read-only.
// value 0 = not yet rated.
export default function RatingMeter({ value = 0, onChange, disabled = false }) {
  const [hover, setHover] = useState(0);
  const shown = !disabled && hover ? hover : value;
  return (
    <div className={`rmeter ${disabled ? 'is-readonly' : ''}`}>
      <div className="rmeter__scale" onMouseLeave={() => setHover(0)}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            disabled={disabled}
            className={`rmeter__seg ${n <= shown ? 'is-on' : ''}`}
            onMouseEnter={() => !disabled && setHover(n)}
            onClick={() => onChange?.(n)}
            aria-label={`Оценка ${n} из 10`}
            aria-pressed={value === n}
          />
        ))}
      </div>
      <div className="rmeter__readout">
        <span className="rmeter__num">{value || '–'}</span>
        <span className="rmeter__max">/10</span>
      </div>
    </div>
  );
}
