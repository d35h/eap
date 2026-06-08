import { useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { setSubmissionsOpen } from '../lib/cycleRepo.js';

// Admin submission control + new-cycle reset. `cycle` + `onChanged` come from
// the parent so the cycle panel and tours panel share one source of truth.
export default function AdminCyclePanel({ cycle, canStartNew, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const [newMsg, setNewMsg] = useState(null);

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

  const startNewCycle = async () => {
    setBusy(true);
    setNewMsg(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/.netlify/functions/start-new-cycle', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token || ''}` },
      });
      const d = await res.json().catch(() => ({}));
      if (d.ok) {
        setNewMsg({ type: 'ok', text: `Новый цикл №${d.edition}. Жюри отозвано: ${d.jurorsRevoked}.` });
        setConfirmNew(false);
        onChanged?.();
      } else {
        setNewMsg({ type: 'error', text: 'Не удалось начать новый цикл.' });
      }
    } catch {
      setNewMsg({ type: 'error', text: 'Не удалось начать новый цикл.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel__head">
        <h3 className="panel-title">Приём заявок</h3>
        <span className={`cycle-state cycle-state--${effectiveOpen ? 'open' : 'closed'}`}>
          {effectiveOpen ? 'Открыт' : 'Закрыт'}
        </span>
      </div>

      <div className="admin-row">
        <div className="admin-row__label">
          <span className="admin-row__title">Статус приёма заявок</span>
          <span className="admin-row__desc">
            {effectiveOpen
              ? 'Художники могут подавать заявки. Нажмите «Остановить приём заявок», чтобы завершить приём.'
              : deadlinePassed
              ? 'Дедлайн прошёл — приём закрыт автоматически.'
              : reopenBlocked
              ? 'Нажмите «Завершить оценку жюри» в блоке «Результаты туров», чтобы снова начать приём заявок.'
              : 'Нажмите «Начать приём заявок», чтобы снова начать приём.'}
          </span>
        </div>
        <div className="admin-row__control">
          <button type="button" className="btn-ink tours-btn" onClick={toggle} disabled={busy || reopenBlocked}>
            {open ? 'Остановить приём заявок' : 'Начать приём заявок'}
          </button>
        </div>
      </div>

      <div className="admin-row">
        <div className="admin-row__label">
          <span className="admin-row__title">Новый цикл биеннале</span>
          <span className="admin-row__desc">
            Текущий: Биеннале №{cycle.current_edition || 1}.
            {!canStartNew && ' Начать новый можно после окончания второго тура и выбора победителей.'}
          </span>
        </div>
        {canStartNew && !confirmNew && (
          <div className="admin-row__control">
            <button type="button" className="btn-ink tours-btn" disabled={busy} onClick={() => setConfirmNew(true)}>
              Начать новый цикл
            </button>
          </div>
        )}
      </div>

      {confirmNew && (
        <div className="tours-confirm admin-confirm">
          <span className="tours-confirm__text">
            Начать новый цикл? Текущие заявки архивируются, все жюри будут отозваны, приём откроется заново.
          </span>
          <div className="tours-panel__actions">
            <button type="button" className="btn-ink tours-btn" disabled={busy} onClick={() => setConfirmNew(false)}>
              Отмена
            </button>
            <button type="button" className="btn-gold tours-btn" disabled={busy} onClick={startNewCycle}>
              Подтвердить
            </button>
          </div>
        </div>
      )}
      {newMsg && <p className={`admin-note ${newMsg.type === 'error' ? 'cycle-note--error' : ''}`}>{newMsg.text}</p>}
    </div>
  );
}
