import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { updateCycle } from '../lib/cycleRepo.js';
import { REVIEW_CRITERIA } from '../lib/reviewCriteria.js';

// Sum of a review's criterion ratings.
const reviewTotal = (scores) =>
  REVIEW_CRITERIA.reduce((s, c) => s + (Number(scores?.[c.key]?.rating) || 0), 0);

const applicant = (a) =>
  [a.first_name, a.last_name].filter(Boolean).join(' ') || a.email || a.id.slice(0, 8);

const medal = (p) => (p === 1 ? '🥇' : p === 2 ? '🥈' : p === 3 ? '🥉' : '🏆');

// Admin Tours panel: switch between tours to see results; run the active tour's
// open/close + selection. `cycle`, `reviewsByApp` (for viewTour) and the
// view-tour state come from the parent.
export default function AdminToursPanel({ cycle, applications, reviewsByApp, jurors, viewTour, setViewTour, onChanged }) {
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState(null);
  const [confirmResend, setConfirmResend] = useState(false);

  if (!cycle) return null;

  const activeTour = cycle.active_tour || 1;
  const isActiveView = viewTour === activeTour;
  const tourOpen = activeTour === 1 ? cycle.tour1_open : cycle.tour2_open;
  const openField = activeTour === 1 ? 'tour1_open' : 'tour2_open';

  const deadlinePassed = cycle.submissions_deadline && new Date(cycle.submissions_deadline) < new Date();
  const submissionsClosed = !cycle.submissions_open || deadlinePassed;

  // Scores come from reviewsByApp, which the parent loads for the VIEWED tour.
  const scoreOf = (id) => {
    const finished = (reviewsByApp[id] || []).filter((r) => r.status === 'finished');
    if (!finished.length) return null;
    return finished.reduce((s, r) => s + reviewTotal(r.scores), 0) / finished.length;
  };
  const finishedCount = (id) => (reviewsByApp[id] || []).filter((r) => r.status === 'finished').length;

  // Tabs: tour 1 always; tour 2 once anything reached it.
  const tour2Exists = activeTour === 2 || applications.some((a) => (a.tour || 1) === 2);
  const tours = tour2Exists ? [1, 2] : [1];
  const winnersExist = applications.some((a) => a.standing === 'winner');
  const tour1Finalized = activeTour === 1 && tour2Exists;

  // Participants of the VIEWED tour (everyone started tour 1; tour 2 = advanced).
  const participants = applications.filter(
    (a) => a.payment_status === 'paid' && (viewTour === 1 || (a.tour || 1) === 2)
  );
  const rankedResults = [...participants].sort((a, b) => (scoreOf(b.id) ?? -1) - (scoreOf(a.id) ?? -1));

  // Winner placements (rank among winners by score).
  const winnersSorted = participants
    .filter((a) => a.standing === 'winner')
    .sort((a, b) => (scoreOf(b.id) ?? -1) - (scoreOf(a.id) ?? -1));
  const placeByApp = new Map(winnersSorted.map((a, i) => [a.id, i + 1]));

  // Active-tour set (for quorum + selection). Valid because controls only show
  // when viewing the active tour, where reviewsByApp is that tour's reviews.
  const activeApps = applications.filter(
    (a) => a.payment_status === 'paid' && a.standing === 'active' && (a.tour || 1) === activeTour
  );
  const expected = jurors.length * activeApps.length;
  const done = activeApps.reduce((s, a) => s + finishedCount(a.id), 0);
  const quorumMet = expected > 0 && done >= expected;
  const rankedActive = [...activeApps].sort((a, b) => (scoreOf(b.id) ?? -1) - (scoreOf(a.id) ?? -1));
  const defaultN = activeTour === 1 ? Math.ceil(activeApps.length / 2) : Math.min(3, activeApps.length);

  const outcome = (a) => {
    if (viewTour === 1) {
      if ((a.tour || 1) >= 2) return { label: 'Прошёл', cls: 'finished' };
      if (a.standing === 'eliminated') return { label: 'Выбыл', cls: 'none' };
      return { label: 'Идёт оценка', cls: 'draft' };
    }
    if (a.standing === 'winner') {
      const p = placeByApp.get(a.id);
      return { label: `${medal(p)} #${p}`, cls: 'finished' };
    }
    if (a.standing === 'eliminated') return { label: 'Выбыл', cls: 'none' };
    return { label: 'Идёт оценка', cls: 'draft' };
  };

  const setOpen = async (open) => {
    if (open && !submissionsClosed) return;
    setBusy(true);
    try { await updateCycle({ [openField]: open }); onChanged?.(); }
    finally { setBusy(false); }
  };

  const startSelection = () => {
    setPicked(new Set(rankedActive.slice(0, defaultN).map((a) => a.id)));
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
      onChanged?.();
    } finally { setBusy(false); }
  };

  const startTour2 = async () => {
    setBusy(true);
    try { await updateCycle({ active_tour: 2 }); setViewTour?.(2); onChanged?.(); }
    finally { setBusy(false); }
  };

  const resultsSent = viewTour === 1 ? cycle.tour1_results_sent : cycle.tour2_results_sent;
  const viewTourFinalized = viewTour === 1 ? tour2Exists : winnersExist;

  const sendResults = async (force) => {
    setSending(true);
    setSendMsg(null);
    setConfirmResend(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/.netlify/functions/send-tour-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ tour: viewTour, force: !!force }),
      });
      const d = await res.json().catch(() => ({}));
      if (d.status === 'sent') {
        setSendMsg({ type: 'ok', text: `Отправлено писем: ${d.count}` });
        onChanged?.();
      } else {
        setSendMsg({ type: 'error', text: 'Не удалось отправить.' });
      }
    } catch {
      setSendMsg({ type: 'error', text: 'Не удалось отправить.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="tours-panel">
      <div className="tours-tabs">
        {tours.map((tn) => (
          <button
            key={tn}
            type="button"
            className={`tours-tab ${viewTour === tn ? 'is-active' : ''}`}
            onClick={() => { setSendMsg(null); setConfirmResend(false); setViewTour?.(tn); }}
          >
            Тур {tn}
          </button>
        ))}
      </div>

      {/* Controls — only for the active tour, and not while selecting. */}
      {isActiveView && !selecting && !winnersExist && (
        tour1Finalized ? (
          <div className="tours-panel__row">
            <span className="cycle-note">Тур 1 завершён — прошедшие заявки ждут второго тура.</span>
            <div className="tours-panel__actions">
              <button type="button" className="btn-gold tours-btn" disabled={busy} onClick={startTour2}>
                Начать тур 2
              </button>
            </div>
          </div>
        ) : (
          <div className="tours-panel__row">
            <div className="tours-panel__state">
              <span className={`cycle-state cycle-state--${tourOpen ? 'open' : 'closed'}`}>
                Оценки {tourOpen ? 'открыты' : 'закрыты'}
              </span>
              {tourOpen && (
                <span className="cycle-note">
                  оценили {done}/{expected || 0}
                  {quorumMet
                    ? ' · можно подводить итоги'
                    : ' · отбор станет доступен, когда все жюри оценят все заявки'}
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
            </div>
          </div>
        )
      )}

      {/* Selection (active tour). */}
      {isActiveView && selecting && (
        <div className="tours-select">
          <p className="tours-select__hint">
            {activeTour === 1
              ? `Отметьте заявки, которые проходят в тур 2 (по умолчанию топ-${defaultN}).`
              : `Отметьте победителей (по умолчанию топ-${defaultN}).`}
          </p>
          <ul className="tours-select__list">
            {rankedActive.map((a, i) => {
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

      {/* Results for the viewed tour. */}
      {!selecting && (
        <div className="tours-results">
          <span className="account-section-label">Результаты · тур {viewTour}</span>
          {viewTourFinalized && (
            <div className="tours-send">
              {!resultsSent ? (
                <button type="button" className="btn-gold tours-btn" disabled={sending} onClick={() => sendResults(false)}>
                  Отправить результаты участникам
                </button>
              ) : confirmResend ? (
                <div className="tours-confirm">
                  <span className="tours-confirm__text">Отправить результаты повторно всем участникам тура {viewTour}?</span>
                  <div className="tours-panel__actions">
                    <button type="button" className="btn-ink tours-btn" disabled={sending} onClick={() => setConfirmResend(false)}>
                      Отмена
                    </button>
                    <button type="button" className="btn-gold tours-btn" disabled={sending} onClick={() => sendResults(true)}>
                      Подтвердить отправку
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <span className="cycle-state cycle-state--open">Результаты отправлены</span>
                  <button type="button" className="btn-ink tours-btn" disabled={sending} onClick={() => setConfirmResend(true)}>
                    Отправить повторно
                  </button>
                </>
              )}
              {sendMsg && (
                <span className={`cycle-note ${sendMsg.type === 'error' ? 'cycle-note--error' : ''}`}>{sendMsg.text}</span>
              )}
            </div>
          )}
          {rankedResults.length === 0 && <p className="cycle-note">Нет заявок</p>}
          {rankedResults.map((a, i) => {
            const sc = scoreOf(a.id);
            const o = outcome(a);
            return (
              <Link key={a.id} to={`/account/results/${a.id}/${viewTour}`} className="tours-result">
                <span className="tours-result__rank">{i + 1}</span>
                <span className="tours-result__name">
                  <span className="tours-result__title">{applicant(a)}</span>
                  {a.email && <span className="tours-result__sub">{a.email}</span>}
                </span>
                <span className="tours-result__score">{sc == null ? '—' : sc.toFixed(1)}</span>
                <span className={`review-chip review-chip--${o.cls}`}>{o.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
