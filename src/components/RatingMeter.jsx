import { useState } from 'react';

// A 1–10 score selector: ten numbered cells, pick one. The chosen cell fills
// gold and lifts; a large serif readout echoes the value. Interactive (hover
// preview) or read-only. value 0 = not yet rated.
export default function RatingMeter({ value = 0, onChange, disabled = false }) {
  const [hover, setHover] = useState(0);
  return (
    <div className={`rmeter ${disabled ? 'is-readonly' : ''}`}>
      <div className="rmeter__scale" role="radiogroup" aria-label="Оценка от 1 до 10" onMouseLeave={() => setHover(0)}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            disabled={disabled}
            className={`rmeter__cell ${value === n ? 'is-selected' : ''} ${!disabled && hover === n ? 'is-hover' : ''}`}
            onMouseEnter={() => !disabled && setHover(n)}
            onClick={() => onChange?.(n)}
            role="radio"
            aria-checked={value === n}
            aria-label={`Оценка ${n} из 10`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="rmeter__readout" aria-hidden="true">
        <span className="rmeter__num">{value || '–'}</span>
        <span className="rmeter__max">/10</span>
      </div>
    </div>
  );
}
