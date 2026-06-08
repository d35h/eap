const STAGES = [
  { key: 'submissions', label: 'Приём заявок' },
  { key: 'tour1', label: 'Тур 1' },
  { key: 'tour2', label: 'Тур 2' },
  { key: 'done', label: 'Итоги' },
];

// Horizontal lifecycle stepper for the current biennale cycle.
// `phase` is one of the STAGES keys.
export default function AdminStageTracker({ phase }) {
  const current = Math.max(0, STAGES.findIndex((s) => s.key === phase));
  return (
    <div className="stage-tracker" role="list">
      {STAGES.map((s, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'future';
        return (
          <div key={s.key} className={`stage stage--${state}`} role="listitem">
            <span className="stage__dot">{state === 'done' ? '✓' : i + 1}</span>
            <span className="stage__label">{s.label}</span>
            {i < STAGES.length - 1 && <span className="stage__bar" />}
          </div>
        );
      })}
    </div>
  );
}
