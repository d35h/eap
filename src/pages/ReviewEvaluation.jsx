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
import RatingMeter from '../components/RatingMeter.jsx';
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
      <div className="container review-page">
        <Link to="/account" className="review-back">← Назад</Link>
        <div className="apply-head">
          <span className="eyebrow">- Рассмотрение</span>
          <h1>Оценка заявки</h1>
        </div>

        {/* Jurors see the works only — no artist name, contact, or status. */}
        {app && app.works && app.works.length > 0 && (
          <div className="review-works">
            {app.works.map((w, i) => {
              const url = files[i + 1];
              const meta = [w.year, w.media, w.size].filter(Boolean).join(' · ');
              return (
                <figure className="work" key={i}>
                  <div className="work__plate">
                    <span className="work__index">Работа {i + 1}</span>
                    <h2 className="work__title">{w.title || 'Без названия'}</h2>
                    {meta && <p className="work__meta">{meta}</p>}
                    {w.desc && <p className="work__desc">{w.desc}</p>}
                  </div>
                  {url ? (
                    <a className="work__frame" href={url} target="_blank" rel="noreferrer">
                      <SmartImg src={imgScaled(url, 1400)} alt={w.title || ''} />
                    </a>
                  ) : (
                    <div className="review-work__noimg">Нет изображения</div>
                  )}
                </figure>
              );
            })}
          </div>
        )}

        {locked && (
          <div className="review-done">
            <span className="review-done__icon" aria-hidden="true">✓</span>
            <div>
              <strong>Оценка завершена</strong>
              <p>Вы оценили эту заявку. Чтобы внести изменения, обратитесь к организаторам.</p>
            </div>
          </div>
        )}

        {ready && (
          <div className="scorecard">
            {!locked && (
              <p className="scorecard__lead">
                Оцените работу по двум критериям — поставьте оценку от 1 до {MAX_RATING}
                и напишите развёрнутый комментарий (не короче {MIN_REVIEW_CHARS} символов).
              </p>
            )}

            {REVIEW_CRITERIA.map((c, i) => {
              const e = scores[c.key] || { rating: 0, text: '' };
              const len = (e.text || '').trim().length;
              const ok = isCriterionValid(e);
              return (
                <section key={c.key} className={`crit ${ok ? 'is-done' : ''}`}>
                  <header className="crit__head">
                    <span className="crit__index" aria-hidden="true">{ok ? '✓' : i + 1}</span>
                    <div className="crit__heading">
                      <h2 className="crit__title">{c.title}</h2>
                      <p className="crit__hint">{c.hint}</p>
                    </div>
                  </header>

                  <div className="crit__field">
                    <span className="crit__label">Оценка</span>
                    <RatingMeter value={e.rating} disabled={locked} onChange={(v) => setEntry(c.key, { rating: v })} />
                  </div>

                  <div className="crit__field">
                    <span className="crit__label">Комментарий</span>
                    {locked ? (
                      <p className="crit__comment">{e.text || '—'}</p>
                    ) : (
                      <>
                        <textarea
                          className="crit__textarea"
                          value={e.text}
                          placeholder="Что в этой работе убеждает или не убеждает? Поделитесь развёрнутым мнением…"
                          onChange={(ev) => setEntry(c.key, { text: ev.target.value })}
                        />
                        <div className={`crit__counter ${len >= MIN_REVIEW_CHARS ? 'is-ok' : ''}`}>
                          {len >= MIN_REVIEW_CHARS ? '✓ Достаточно подробно' : `ещё ${MIN_REVIEW_CHARS - len} симв.`}
                        </div>
                      </>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {ready && !locked && (
          <div className="review-bar">
            <div className="review-bar__status">
              <div className="review-bar__track">
                <span style={{ width: `${(doneCount / REVIEW_CRITERIA.length) * 100}%` }} />
              </div>
              <span className="review-bar__count">
                {complete ? 'Готово к завершению' : `${doneCount} из ${REVIEW_CRITERIA.length} критериев заполнено`}
              </span>
            </div>
            <div className="review-bar__actions">
              {msg && <span className={`review-msg review-msg--${msg.type}`}>{msg.text}</span>}
              <button type="button" className="btn-ink tours-btn" onClick={() => persist(false)} disabled={busy}>
                Сохранить черновик
              </button>
              <button type="button" className="btn-gold tours-btn" onClick={() => persist(true)} disabled={busy || !complete}>
                {complete ? 'Завершить оценку' : `Завершить (${doneCount}/${REVIEW_CRITERIA.length})`}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
