import { useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { setSubmissionsOpen, updateCycle } from '../lib/cycleRepo.js';
import { REVIEW_CRITERIA } from '../lib/reviewCriteria.js';
import JuryCoverage from './JuryCoverage.jsx';

const reviewTotal = (s) => REVIEW_CRITERIA.reduce((a, c) => a + (Number(s?.[c.key]?.rating) || 0), 0);
const applicant = (a) => [a.first_name, a.last_name].filter(Boolean).join(' ') || a.email || a.id.slice(0, 8);

// Single command card: shows the one action for the current cycle phase.
// Replaces the separate submissions + tours panels.
export default function AdminFlowPanel({ cycle, applications, reviewsByApp, jurors, canStartNew, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState(() => new Set());
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState(null);
  const [confirmResend, setConfirmResend] = useState(null); // tour number
  const [confirmNew, setConfirmNew] = useState(false);
  const [newMsg, setNewMsg] = useState(null);

  if (!cycle) return null;

  const activeTour = cycle.active_tour || 1;
  const openField = activeTour === 1 ? 'tour1_open' : 'tour2_open';
  const tourOpen = activeTour === 1 ? cycle.tour1_open : cycle.tour2_open;
  const deadlinePassed = cycle.submissions_deadline && new Date(cycle.submissions_deadline) < new Date();
  const submissionsClosed = !cycle.submissions_open || deadlinePassed;

  const winnersExist = applications.some((a) => a.standing === 'winner');
  const tour2Exists = activeTour === 2 || applications.some((a) => (a.tour || 1) === 2);
  const tour1Finalized = activeTour === 1 && tour2Exists && !winnersExist;

  // Quorum over the active tour's still-active, paid applications.
  const scoreOf = (id) => {
    const fin = (reviewsByApp[id] || []).filter((r) => r.status === 'finished');
    return fin.length ? fin.reduce((s, r) => s + reviewTotal(r.scores), 0) / fin.length : null;
  };
  const finishedCount = (id) => (reviewsByApp[id] || []).filter((r) => r.status === 'finished').length;
  const activeApps = applications.filter(
    (a) => a.payment_status === 'paid' && a.standing === 'active' && (a.tour || 1) === activeTour
  );
  const expected = jurors.length * activeApps.length;
  const done = activeApps.reduce((s, a) => s + finishedCount(a.id), 0);
  const quorumMet = expected > 0 && done >= expected;
  const rankedActive = [...activeApps].sort((a, b) => (scoreOf(b.id) ?? -1) - (scoreOf(a.id) ?? -1));
  const defaultN = activeTour === 1 ? Math.ceil(activeApps.length / 2) : Math.min(3, activeApps.length);

  // Phase
  const phase = winnersExist ? 'done'
    : tour1Finalized ? 'tour1done'
    : !submissionsClosed ? 'submissions'
    : 'evaluation';

  // ── Handlers ──
  const toggleSubmissions = async (open) => {
    setBusy(true);
    try { await setSubmissionsOpen(open); onChanged?.(); } finally { setBusy(false); }
  };
  const setEvalOpen = async (open) => {
    if (open && !submissionsClosed) return;
    setBusy(true);
    try { await updateCycle({ [openField]: open }); onChanged?.(); } finally { setBusy(false); }
  };
  const startSelection = () => {
    setPicked(new Set(rankedActive.slice(0, defaultN).map((a) => a.id)));
    setSelecting(true);
  };
  const togglePick = (id) => setPicked((prev) => {
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
        body: JSON.stringify({ action: activeTour === 1 ? 'advance' : 'winners', tour: activeTour, advanceIds: [...picked] }),
      });
      await updateCycle({ [openField]: false });
      setSelecting(false);
      onChanged?.();
    } finally { setBusy(false); }
  };
  const startTour2 = async () => {
    setBusy(true);
    try { await updateCycle({ active_tour: 2 }); onChanged?.(); } finally { setBusy(false); }
  };
  const sendResults = async (tour, force) => {
    setSending(true); setSendMsg(null); setConfirmResend(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/.netlify/functions/send-tour-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ tour, force: !!force }),
      });
      const d = await res.json().catch(() => ({}));
      if (d.status === 'sent') { setSendMsg({ type: 'ok', text: `Отправлено писем: ${d.count}` }); onChanged?.(); }
      else setSendMsg({ type: 'error', text: 'Не удалось отправить.' });
    } catch { setSendMsg({ type: 'error', text: 'Не удалось отправить.' }); }
    finally { setSending(false); }
  };
  const startNewCycle = async () => {
    setBusy(true); setNewMsg(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/.netlify/functions/start-new-cycle', {
        method: 'POST', headers: { Authorization: `Bearer ${session?.access_token || ''}` },
      });
      const d = await res.json().catch(() => ({}));
      if (d.ok) { setNewMsg({ type: 'ok', text: `Новый цикл №${d.edition}. Жюри отозвано: ${d.jurorsRevoked}.` }); setConfirmNew(false); onChanged?.(); }
      else setNewMsg({ type: 'error', text: 'Не удалось начать новый цикл.' });
    } catch { setNewMsg({ type: 'error', text: 'Не удалось начать новый цикл.' }); }
    finally { setBusy(false); }
  };

  // ── Per-tour "send results" control ──
  const renderSend = (tour) => {
    const sent = tour === 1 ? cycle.tour1_results_sent : cycle.tour2_results_sent;
    if (!sent) {
      return (
        <button type="button" className="btn-gold tours-btn" disabled={sending} onClick={() => sendResults(tour, false)}>
          Отправить результаты участникам · Тур {tour}
        </button>
      );
    }
    if (confirmResend === tour) {
      return (
        <div className="tours-confirm">
          <span className="tours-confirm__text">Отправить результаты повторно всем участникам тура {tour}?</span>
          <div className="tours-panel__actions">
            <button type="button" className="btn-ink tours-btn" disabled={sending} onClick={() => setConfirmResend(null)}>Отмена</button>
            <button type="button" className="btn-gold tours-btn" disabled={sending} onClick={() => sendResults(tour, true)}>Подтвердить отправку</button>
          </div>
        </div>
      );
    }
    return (
      <>
        <span className="cycle-state cycle-state--open">Результаты тура {tour} отправлены</span>
        <button type="button" className="btn-ink tours-btn" disabled={sending} onClick={() => setConfirmResend(tour)}>Отправить повторно</button>
      </>
    );
  };

  // Head title + status badge per phase.
  const head = {
    submissions: { title: 'Приём заявок', badge: { label: 'Открыт', cls: 'open' } },
    evaluation: {
      title: `Тур ${activeTour} · Оценка жюри`,
      badge: tourOpen ? { label: 'Идёт оценка жюри', cls: 'open' }
        : quorumMet ? { label: 'Оценка завершена', cls: 'open' }
        : { label: 'Оценка не начата', cls: 'closed' },
    },
    tour1done: { title: 'Тур 1 завершён', badge: { label: 'Готов к туру 2', cls: 'open' } },
    done: { title: 'Итоги · победители выбраны', badge: { label: 'Цикл завершён', cls: 'open' } },
  }[phase];

  return (
    <div className="admin-panel">
      <div className="admin-panel__head">
        <h3 className="panel-title">{head.title}</h3>
        <span className={`cycle-state cycle-state--${head.badge.cls}`}>{head.badge.label}</span>
      </div>

      {selecting ? (
        <div className="tours-select">
          <p className="tours-select__hint">
            {activeTour === 1
              ? `Отметьте заявки, которые проходят в тур 2 (по умолчанию топ-${defaultN}).`
              : `Отметьте победителей (по умолчанию топ-${defaultN}).`}
          </p>
          <ul className="tours-select__list">
            {rankedActive.map((a, i) => (
              <li key={a.id} className="tours-select__item">
                <label>
                  <input type="checkbox" checked={picked.has(a.id)} onChange={() => togglePick(a.id)} />
                  <span className="tours-select__rank">{i + 1}</span>
                  <span className="tours-select__name">{applicant(a)}</span>
                  <span className="tours-select__score">{scoreOf(a.id) == null ? '—' : scoreOf(a.id).toFixed(1)}</span>
                </label>
              </li>
            ))}
          </ul>
          <div className="tours-panel__actions">
            <button type="button" className="btn-ink tours-btn" disabled={busy} onClick={() => setSelecting(false)}>Отмена</button>
            <button type="button" className="btn-gold tours-btn" disabled={busy} onClick={confirmSelection}>
              Подтвердить отбор ({picked.size})
            </button>
          </div>
        </div>
      ) : (
        <div className="admin-row">
          <div className="admin-row__label">
            <span className="admin-row__desc">
              {phase === 'submissions' && 'Художники подают заявки. Когда приём закончится — остановите его, чтобы начать оценку жюри.'}
              {phase === 'evaluation' && (tourOpen
                ? (quorumMet
                  ? `Все жюри оценили заявки тура ${activeTour}. Завершите оценку, чтобы перейти к отбору.`
                  : `Жюри сейчас оценивает заявки тура ${activeTour}.`)
                : (quorumMet
                  ? 'Все жюри завершили оценку. Отберите участников.'
                  : `Нажмите «Отправить заявки жюри», чтобы жюри оценили заявки в туре ${activeTour}.`))}
              {phase === 'tour1done' && 'Тур 1 завершён. Отправьте результаты участникам и начните тур 2.'}
              {phase === 'done' && 'Победители выбраны. Отправьте результаты участникам и при желании начните новый цикл.'}
            </span>
          </div>
          <div className="admin-row__control">
            {phase === 'submissions' && (
              <button type="button" className="btn-ink tours-btn" disabled={busy} onClick={() => toggleSubmissions(false)}>
                Остановить приём заявок
              </button>
            )}
            {phase === 'evaluation' && (
              tourOpen ? (
                <button type="button" className="btn-ink tours-btn" disabled={busy} onClick={() => setEvalOpen(false)}>
                  Завершить оценку жюри
                </button>
              ) : quorumMet ? (
                <button type="button" className="btn-gold tours-btn" disabled={busy} onClick={startSelection}>
                  {activeTour === 1 ? 'Отобрать во второй тур' : 'Выбрать победителей'}
                </button>
              ) : (
                <button type="button" className="btn-ink tours-btn" disabled={busy} onClick={() => setEvalOpen(true)}>
                  Отправить заявки жюри на оценку · Тур {activeTour}
                </button>
              )
            )}
            {phase === 'tour1done' && (
              <>
                {renderSend(1)}
                <button type="button" className="btn-gold tours-btn" disabled={busy} onClick={startTour2}>Начать тур 2</button>
              </>
            )}
            {phase === 'done' && (
              <>
                {renderSend(2)}
                {!confirmNew && (
                  <button type="button" className="btn-ink tours-btn" disabled={busy || !canStartNew} onClick={() => setConfirmNew(true)}>
                    Начать новый цикл
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Jury coverage — who has reviewed, and which artists each one skipped. */}
      {phase === 'evaluation' && !selecting && (
        <JuryCoverage jurors={jurors} edition={cycle.current_edition || 1} tour={activeTour} />
      )}

      {/* Re-open submissions: only before tour 1 evaluation has begun. */}
      {phase === 'evaluation' && activeTour === 1 && !tourOpen && !quorumMet && !tour2Exists && (
        <p className="admin-note">
          Закрыли приём по ошибке?{' '}
          <button type="button" className="linklike" disabled={busy} onClick={() => toggleSubmissions(true)}>Возобновить приём заявок</button>
        </p>
      )}

      {confirmNew && (
        <div className="tours-confirm admin-confirm">
          <span className="tours-confirm__text">
            Начать новый цикл? Текущие заявки архивируются, все жюри будут отозваны, приём откроется заново.
          </span>
          <div className="tours-panel__actions">
            <button type="button" className="btn-ink tours-btn" disabled={busy} onClick={() => setConfirmNew(false)}>Отмена</button>
            <button type="button" className="btn-gold tours-btn" disabled={busy} onClick={startNewCycle}>Подтвердить</button>
          </div>
        </div>
      )}
      {sendMsg && <p className={`admin-note ${sendMsg.type === 'error' ? 'cycle-note--error' : ''}`}>{sendMsg.text}</p>}
      {newMsg && <p className={`admin-note ${newMsg.type === 'error' ? 'cycle-note--error' : ''}`}>{newMsg.text}</p>}
    </div>
  );
}
