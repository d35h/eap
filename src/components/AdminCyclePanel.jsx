import { useEffect, useState } from 'react';
import { getCycle, setSubmissionsOpen } from '../lib/cycleRepo.js';

// Admin control panel for the open call (submission control; tours later).
export default function AdminCyclePanel() {
  const [cycle, setCycle] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { getCycle().then(setCycle); }, []);

  if (!cycle) return null;

  const open = cycle.submissions_open;
  const deadlinePassed = cycle.submissions_deadline && new Date(cycle.submissions_deadline) < new Date();
  const effectiveOpen = open && !deadlinePassed;

  const toggle = async () => {
    setBusy(true);
    try {
      await setSubmissionsOpen(!open);
      setCycle({ ...cycle, submissions_open: !open });
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
        </div>
        <button type="button" className="btn-ink cycle-panel__btn" onClick={toggle} disabled={busy}>
          {open ? 'Остановить приём' : 'Открыть приём'}
        </button>
      </div>
    </div>
  );
}
