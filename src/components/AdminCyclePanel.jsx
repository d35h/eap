import { useState } from 'react';
import { setSubmissionsOpen } from '../lib/cycleRepo.js';

// Admin submission control. `cycle` + `onChanged` come from the parent so the
// cycle panel and tours panel share one source of truth.
export default function AdminCyclePanel({ cycle, onChanged }) {
  const [busy, setBusy] = useState(false);

  if (!cycle) return null;

  const open = cycle.submissions_open;
  const deadlinePassed = cycle.submissions_deadline && new Date(cycle.submissions_deadline) < new Date();
  const effectiveOpen = open && !deadlinePassed;
  // Can't re-open submissions while jury evaluations are running.
  const evaluationsOpen = cycle.tour1_open || cycle.tour2_open;
  const reopenBlocked = !open && evaluationsOpen;

  const toggle = async () => {
    if (reopenBlocked) return; // guard: close evaluations first
    setBusy(true);
    try {
      await setSubmissionsOpen(!open);
      onChanged?.();
    } catch {
      /* RLS / network */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cycle-panel">
      <h3 className="panel-title">Приём заявок</h3>
      <div className="cycle-panel__row">
        <div className="cycle-panel__state">
          <span className={`cycle-state cycle-state--${effectiveOpen ? 'open' : 'closed'}`}>
            {effectiveOpen ? 'Открыт' : 'Закрыт'}
          </span>
          {deadlinePassed && <span className="cycle-note">дедлайн прошёл — закрыто автоматически</span>}
          {reopenBlocked && <span className="cycle-note">Сначала закройте приём оценок</span>}
        </div>
        <button
          type="button"
          className="btn-ink cycle-panel__btn"
          onClick={toggle}
          disabled={busy || reopenBlocked}
          title={reopenBlocked ? 'Сначала закройте приём оценок' : ''}
        >
          {open ? 'Остановить приём' : 'Открыть приём'}
        </button>
      </div>
    </div>
  );
}
