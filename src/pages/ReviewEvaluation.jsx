import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import {
  REVIEW_CRITERIA,
  MIN_REVIEW_CHARS,
  MAX_RATING,
  isCriterionValid,
  isEvaluationComplete,
} from '../lib/reviewCriteria.js';
import { getMyReview, saveDraft, finishReview } from '../lib/reviewsRepo.js';
import { imgScaled } from '../lib/img.js';
import SmartImg from '../components/SmartImg.jsx';
import { getCycle } from '../lib/cycleRepo.js';

export default function ReviewEvaluation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const isJuror = user?.app_metadata?.role === 'juror';

  const [app, setApp] = useState(null);
  const [scores, setScores] = useState({});
  const [status, setStatus] = useState('draft');
  const [unlocked, setUnlocked] = useState(false);
  const [files, setFiles] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { type, text }
  const [ready, setReady] = useState(false);
  const [tour, setTour] = useState(1);
  const [evalsOpen, setEvalsOpen] = useState(true);

  // Only jurors evaluate.
  useEffect(() => {
    if (loading || !isSupabaseConfigured()) return;
    if (!user) navigate('/login');
    else if (!isJuror) navigate('/account');
  }, [user, loading, isJuror, navigate]);

  // Load the application + this juror's existing review (draft or finished).
  useEffect(() => {
    if (!user || !isJuror || !supabase) return;
    let cancelled = false;
    (async () => {
      const cycle = await getCycle();
      const activeTour = cycle?.active_tour || 1;
      const open = activeTour === 1 ? !!cycle?.tour1_open : !!cycle?.tour2_open;
      const { data: appRow } = await supabase
        .from('applications').select('*').eq('id', id).maybeSingle();
      const review = await getMyReview(id, user.id, activeTour);
      if (cancelled) return;
      setTour(activeTour);
      setEvalsOpen(open);
      setApp(appRow || null);
      const base = {};
      REVIEW_CRITERIA.forEach((c) => {
        const e = review?.scores?.[c.key];
        base[c.key] = { rating: e?.rating ?? 0, text: e?.text ?? '' };
      });
      setScores(base);
      setStatus(review?.status || 'draft');
      setUnlocked(review?.unlocked || false);
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, [id, user, isJuror]);

  // Signed URLs so the juror can see the actual works.
  useEffect(() => {
    if (!app || !supabase) return;
    let cancelled = false;
    (async () => {
      const folder = `applications/${app.id}`;
      const { data: list } = await supabase.storage.from('works').list(folder);
      if (!list || list.length === 0) return;
      const paths = list.map((f) => `${folder}/${f.name}`);
      const { data: signed } = await supabase.storage.from('works').createSignedUrls(paths, 3600);
      const map = {};
      (signed || []).forEach((s, i) => {
        if (!s?.signedUrl) return;
        const m = /^work(\d+)\./.exec(list[i].name);
        if (m) map[Number(m[1])] = s.signedUrl;
      });
      if (!cancelled) setFiles(map);
    })();
    return () => { cancelled = true; };
  }, [app]);

  if (!isSupabaseConfigured() || loading || !user || !isJuror) return null;

  if (ready && !evalsOpen) {
    return (
      <main className="apply-page account-page">
        <div className="container">
          <Link to="/account" className="review-back">← Назад</Link>
          <div className="jury-waiting">
            <h2 className="panel-title">Оценка ещё не началась</h2>
            <p>Как только организаторы откроют приём оценок, заявки появятся здесь.</p>
          </div>
        </div>
      </main>
    );
  }

  const locked = status === 'finished' && !unlocked;
  const complete = isEvaluationComplete(scores);
  const doneCount = REVIEW_CRITERIA.filter((c) => isCriterionValid(scores[c.key])).length;
  const incomplete = REVIEW_CRITERIA.filter((c) => !isCriterionValid(scores[c.key]));

  const setEntry = (key, patch) =>
    setScores((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const persist = async (finish) => {
    setBusy(true);
    setMsg(null);
    try {
      const args = { applicationId: id, userId: user.id, email: user.email, scores, tour };
      if (finish) {
        await finishReview(args);
        // Return to the review queue so the juror can pick the next application.
        navigate('/account', { state: { reviewed: id } });
        return;
      } else {
        await saveDraft(args);
        setMsg({ type: 'ok', text: 'Черновик сохранён.' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Не удалось сохранить.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="apply-page account-page">
      <div className="container">
        <Link to="/account" className="review-back">← Назад</Link>
        <div className="apply-head">
          <span className="eyebrow">- Рассмотрение</span>
          <h1>Оценка заявки</h1>
        </div>

        {app && app.works && app.works.length > 0 && (
          <div className="review-app">
            {/* Jurors see the works only - no artist name, contact, or status. */}
            <div className="review-works">
              {app.works.map((w, i) => {
                const url = files[i + 1];
                return (
                  <figure className="review-work" key={i}>
                    <figcaption>
                      <span className="work-num">Работа {i + 1}</span>
                      <strong>{w.title || '-'}</strong>
                      {w.year ? `, ${w.year}` : ''}{w.media ? ` · ${w.media}` : ''}{w.size ? ` · ${w.size}` : ''}
                      {w.desc ? <p>{w.desc}</p> : null}
                    </figcaption>
                    {url ? (
                      <a href={url} target="_blank" rel="noreferrer">
                        <SmartImg src={imgScaled(url, 1400)} alt={w.title || ''} />
                      </a>
                    ) : (
                      <div className="review-work__noimg">Нет изображения</div>
                    )}
                  </figure>
                );
              })}
            </div>
          </div>
        )}

        {locked && (
          <div className="review-done">
            <span className="review-done__icon" aria-hidden="true">✓</span>
            <div>
              <strong>Вы завершили оценку этой заявки.</strong>
              <p>Чтобы изменить оценку, обратитесь к администратору.</p>
            </div>
          </div>
        )}

        {ready && (
          <div className="review-eval">
            {!locked && (
              <div className="review-intro">
                <p>
                  Оцените заявку по <strong>двум критериям</strong>. По каждому поставьте оценку (0–{MAX_RATING})
                  и напишите комментарий не короче <strong>{MIN_REVIEW_CHARS} символов</strong>.
                  Когда оба критерия заполнены — нажмите «Завершить оценку».
                </p>
                <p className="review-progress">
                  Заполнено критериев: <strong>{doneCount}</strong> из {REVIEW_CRITERIA.length}
                </p>
              </div>
            )}
            {REVIEW_CRITERIA.map((c, i) => {
              const e = scores[c.key] || { rating: 0, text: '' };
              const len = (e.text || '').trim().length;
              const ok = isCriterionValid(e);
              return (
                <div key={c.key} className={`review-crit ${ok ? 'is-done' : ''}`}>
                  <div className="review-crit__head">
                    <span className="review-crit__num">Критерий {i + 1} из {REVIEW_CRITERIA.length}</span>
                    {ok && <span className="review-crit__done">✓ Заполнено</span>}
                  </div>
                  <h2 className="review-panel__title">{c.title}</h2>
                  <p className="review-panel__hint">{c.hint}</p>

                  <div className="review-rating">
                    <label>Оценка: <strong>{e.rating}</strong> / {MAX_RATING}</label>
                    <input
                      type="range" min="0" max={MAX_RATING} step="1"
                      value={e.rating} disabled={locked}
                      onChange={(ev) => setEntry(c.key, { rating: Number(ev.target.value) })}
                    />
                  </div>

                  <div className="review-text">
                    <textarea
                      value={e.text} disabled={locked}
                      placeholder="Развёрнутый комментарий по этому критерию…"
                      onChange={(ev) => setEntry(c.key, { text: ev.target.value })}
                    />
                    <div className={`review-counter ${len >= MIN_REVIEW_CHARS ? 'is-ok' : ''}`}>
                      {len >= MIN_REVIEW_CHARS
                        ? '✓ Комментарий достаточной длины'
                        : `Ещё ${MIN_REVIEW_CHARS - len} символов (минимум ${MIN_REVIEW_CHARS})`}
                    </div>
                  </div>
                </div>
              );
            })}

            {!locked && (
              <>
                {!complete && (
                  <p className="review-finish-hint">
                    Чтобы завершить оценку, добавьте комментарий (≥{MIN_REVIEW_CHARS} символов)
                    {incomplete.length === REVIEW_CRITERIA.length ? ' по обоим критериям' : ` по критерию: ${incomplete.map((c) => c.title).join(', ')}`}.
                  </p>
                )}
                <div className="review-actions">
                  <button type="button" className="btn-ink" onClick={() => persist(false)} disabled={busy}>
                    Сохранить черновик
                  </button>
                  <button
                    type="button"
                    className="btn-gold"
                    onClick={() => persist(true)}
                    disabled={busy || !complete}
                  >
                    {complete ? 'Завершить оценку' : `Завершить оценку (${doneCount}/${REVIEW_CRITERIA.length})`}
                  </button>
                </div>
              </>
            )}

            {msg && <p className={`review-msg review-msg--${msg.type}`}>{msg.text}</p>}
          </div>
        )}
      </div>
    </main>
  );
}
