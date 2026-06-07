import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { getCycle, updateCycle } from '../lib/cycleRepo.js';
import { REVIEW_CRITERIA } from '../lib/reviewCriteria.js';

// Sum of a review's criterion ratings.
const reviewTotal = (scores) =>
  REVIEW_CRITERIA.reduce((s, c) => s + (Number(scores?.[c.key]?.rating) || 0), 0);

// Admin Tours panel: open/close evaluations, then rank + select to advance.
// Props: applications (all), reviewsByApp (active tour), jurors, onChanged().
export default function AdminToursPanel({ applications, reviewsByApp, jurors, onChanged }) {
  const [cycle, setCycle] = useState(null);
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState(() => new Set());
  const [busy, setBusy] = useState(false);

  const loadCycle = () => getCycle().then(setCycle);
  useEffect(() => { loadCycle(); }, []);

  if (!cycle) return null;

  const activeTour = cycle.active_tour || 1;
  const tourOpen = activeTour === 1 ? cycle.tour1_open : cycle.tour2_open;
  const openField = activeTour === 1 ? 'tour1_open' : 'tour2_open';

  // Evaluations can only be opened once the call is closed (no judging while
  // still accepting applications).
  const deadlinePassed = cycle.submissions_deadline && new Date(cycle.submissions_deadline) < new Date();
  const submissionsClosed = !cycle.submissions_open || deadlinePassed;

  // Paid applications still in contention in this tour.
  const activeApps = applications.filter(
    (a) => a.payment_status === 'paid' && a.standing === 'active' && (a.tour || 1) === activeTour
  );

  const scoreOf = (id) => {
    const finished = (reviewsByApp[id] || []).filter((r) => r.status === 'finished');
    if (!finished.length) return null;
    return finished.reduce((s, r) => s + reviewTotal(r.scores), 0) / finished.length;
  };
  const finishedCount = (id) => (reviewsByApp[id] || []).filter((r) => r.status === 'finished').length;

  // Quorum: every juror finished every active application.
  const expected = jurors.length * activeApps.length;
  const done = activeApps.reduce((s, a) => s + finishedCount(a.id), 0);
  const quorumMet = expected > 0 && done >= expected;

  const ranked = [...activeApps].sort((a, b) => (scoreOf(b.id) ?? -1) - (scoreOf(a.id) ?? -1));
  const defaultN = activeTour === 1 ? Math.ceil(activeApps.length / 2) : Math.min(3, activeApps.length);

  const tour1Finalized = activeTour === 1 && applications.some((a) => (a.tour || 1) === 2);
  const winnersExist = applications.some((a) => a.standing === 'winner');

  const setOpen = async (open) => {
    if (open && !submissionsClosed) return; // guard: close submissions first
    setBusy(true);
    try {
      await updateCycle({ [openField]: open });
      await loadCycle();
      onChanged?.();
    } finally { setBusy(false); }
  };

  const startSelection = () => {
    setPicked(new Set(ranked.slice(0, defaultN).map((a) => a.id)));
    setSelecting(true);
  };

  const togglePick = (id) =>
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const confirmSelection = async () => {
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch('/.netlify/functions/run-tour-transition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({
          action: activeTour === 1 ? 'advance' : 'winners',
          tour: activeTour,
          advanceIds: [...picked],
        }),
      });
      await updateCycle({ [openField]: false });
      setSelecting(false);
      await loadCycle();
      onChanged?.();
    } finally { setBusy(false); }
  };

  const startTour2 = async () => {
    setBusy(true);
    try {
      await updateCycle({ active_tour: 2 });
      await loadCycle();
      onChanged?.();
    } finally { setBusy(false); }
  };

  const applicant = (a) =>
    [a.first_name, a.last_name].filter(Boolean).join(' ') || a.email || a.id.slice(0, 8);

  return (
    <div className="tours-panel">
      <div className="tours-panel__head">
        <h3 className="panel-title">Тур {activeTour}</h3>
        {winnersExist && <span className="cycle-state cycle-state--open">Победители выбраны</span>}
      </div>

      {!winnersExist && !selecting && (
        <div className="tours-panel__row">
          <div className="tours-panel__state">
            <span className={`cycle-state cycle-state--${tourOpen ? 'open' : 'closed'}`}>
              Оценки {tourOpen ? 'открыты' : 'закрыты'}
            </span>
            {tourOpen && (
              <span className="cycle-note">
                оценили {done}/{expected || 0} {quorumMet ? '· можно подводить итоги' : ''}
              </span>
            )}
            {!tourOpen && !submissionsClosed && (
              <span className="cycle-note">Сначала закройте приём заявок</span>
            )}
          </div>
          <div className="tours-panel__actions">
            <button
              type="button"
              className="btn-ink tours-btn"
              disabled={busy || (!tourOpen && !submissionsClosed)}
              title={!tourOpen && !submissionsClosed ? 'Сначала закройте приём заявок' : ''}
              onClick={() => setOpen(!tourOpen)}
            >
              {tourOpen ? 'Закрыть приём оценок' : 'Открыть приём оценок'}
            </button>
            {tourOpen && (
              <button
                type="button"
                className="btn-gold tours-btn"
                disabled={busy || !quorumMet}
                title={quorumMet ? '' : 'Доступно, когда все жюри оценят все заявки'}
                onClick={startSelection}
              >
                {activeTour === 1 ? 'Перейти к отбору' : 'Выбрать топ-3'}
              </button>
            )}
            {tour1Finalized && (
              <button type="button" className="btn-gold tours-btn" disabled={busy} onClick={startTour2}>
                Начать тур 2
              </button>
            )}
          </div>
        </div>
      )}

      {selecting && (
        <div className="tours-select">
          <p className="tours-select__hint">
            {activeTour === 1
              ? `Отметьте заявки, которые проходят в тур 2 (по умолчанию топ-${defaultN}).`
              : `Отметьте победителей (по умолчанию топ-${defaultN}).`}
          </p>
          <ul className="tours-select__list">
            {ranked.map((a, i) => {
              const sc = scoreOf(a.id);
              return (
                <li key={a.id} className="tours-select__item">
                  <label>
                    <input type="checkbox" checked={picked.has(a.id)} onChange={() => togglePick(a.id)} />
                    <span className="tours-select__rank">{i + 1}</span>
                    <span className="tours-select__name">{applicant(a)}</span>
                    <span className="tours-select__score">{sc == null ? '—' : sc.toFixed(1)}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          <div className="tours-panel__actions">
            <button type="button" className="btn-ink tours-btn" disabled={busy} onClick={() => setSelecting(false)}>
              Отмена
            </button>
            <button type="button" className="btn-gold tours-btn" disabled={busy} onClick={confirmSelection}>
              Подтвердить отбор ({picked.size})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
