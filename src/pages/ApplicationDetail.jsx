import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { imgScaled } from '../lib/img.js';
import SmartImg from '../components/SmartImg.jsx';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { getCycle } from '../lib/cycleRepo.js';
import { unlockReview } from '../lib/reviewsRepo.js';

const igHandle = (raw) => (!raw ? '' : String(raw).trim()
  .replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/+$/, '').split(/[/?]/)[0]);
const normUrl = (u) => (/^https?:\/\//i.test(u) ? u : `https://${u}`);

// Admin: full detail for one application - applicant, works (large), and the
// jury status per tour with links to the detailed juror evaluations.
export default function ApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const isAdmin = user?.app_metadata?.role === 'admin';

  const [app, setApp] = useState(null);
  const [cycle, setCycle] = useState(null);
  const [jurors, setJurors] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [files, setFiles] = useState({});
  const [refresh, setRefresh] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [pubMsg, setPubMsg] = useState(null);

  useEffect(() => {
    if (loading || !isSupabaseConfigured()) return;
    if (!user) navigate('/login');
    else if (!isAdmin) navigate('/account');
  }, [user, loading, isAdmin, navigate]);

  useEffect(() => {
    if (!isAdmin || !supabase) return;
    let cancelled = false;
    (async () => {
      const { data: appRow } = await supabase.from('applications').select('*').eq('id', id).maybeSingle();
      const cyc = await getCycle();
      const { data: revs } = await supabase.from('application_reviews').select('*').eq('application_id', id);
      if (cancelled) return;
      setApp(appRow || null);
      setCycle(cyc || null);
      setReviews(revs || []);
    })();
    return () => { cancelled = true; };
  }, [id, isAdmin, refresh]);

  useEffect(() => {
    if (!isAdmin || !supabase) return;
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/.netlify/functions/list-jurors', {
        headers: { Authorization: `Bearer ${session?.access_token || ''}` },
      });
      const d = await res.json().catch(() => ({}));
      if (!cancelled && Array.isArray(d.jurors)) setJurors(d.jurors);
    })();
    return () => { cancelled = true; };
  }, [isAdmin]);

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

  if (!isSupabaseConfigured() || loading || !user || !isAdmin) return null;
  if (!app) {
    return (
      <main className="apply-page account-page"><div className="container">
        <Link to="/account" className="review-back">← Назад</Link>
        <p>…</p>
      </div></main>
    );
  }

  const activeTour = cycle?.active_tour || 1;
  const appTour = app.tour || 1;
  const tours = appTour >= 2 ? [1, 2] : [1];
  // The application's current tour is "ongoing" while it's still active there.
  const tourOngoing = (t) => app.standing === 'active' && appTour === t && activeTour === t;

  const handleUnlock = async (reviewId) => {
    try { await unlockReview(reviewId); setRefresh((r) => r + 1); } catch { /* */ }
  };

  const publishIG = async () => {
    setPublishing(true);
    setPubMsg({ type: 'ok', text: 'Публикуется… это может занять до минуты.' });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      // Background function: returns immediately; we poll for published_at.
      await fetch('/.netlify/functions/ig-publish-one-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ applicationId: id }),
      });
      let done = false;
      for (let i = 0; i < 30 && !done; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        const { data: row } = await supabase.from('applications').select('published_at').eq('id', id).maybeSingle();
        if (row?.published_at) done = true;
      }
      if (done) {
        setPubMsg(null);
        setRefresh((r) => r + 1);
      } else {
        setPubMsg({ type: 'error', text: 'Публикация занимает дольше обычного. Обновите страницу через минуту.' });
      }
    } catch {
      setPubMsg({ type: 'error', text: 'Ошибка публикации.' });
    } finally {
      setPublishing(false);
    }
  };

  const applicant = [app.first_name, app.last_name].filter(Boolean).join(' ') || '—';
  const isCurrentEdition = (app.edition || 1) === (cycle?.current_edition || 1);
  const metaParts = [];
  if (app.country) metaParts.push(app.country);
  if (app.city) metaParts.push(app.city);
  if (app.website) metaParts.push(<a key="w" href={normUrl(app.website)} target="_blank" rel="noreferrer">{app.website}</a>);
  if (app.instagram) {
    const h = igHandle(app.instagram);
    metaParts.push(<a key="i" href={`https://instagram.com/${h}`} target="_blank" rel="noreferrer">@{h}</a>);
  }

  return (
    <main className="apply-page account-page">
      <div className="container review-page">
        <Link to="/account" className="review-back">← Назад</Link>
        <div className="apply-head">
          <span className="eyebrow">- Заявка</span>
          <h1>{applicant}</h1>
        </div>

        <div className="detail-id">
          <span className="detail-id__email">{app.email}</span>
          <span className={`account-app-card__status account-app-card__status--${app.payment_status}`}>
            {app.payment_status === 'paid' ? 'Оплачено' : 'Ожидает оплаты'}
          </span>
        </div>
        {metaParts.length > 0 && (
          <p className="detail-meta">
            {metaParts.map((p, i) => <span key={i}>{i > 0 && ' · '}{p}</span>)}
          </p>
        )}

        {app.payment_status === 'paid' && isCurrentEdition && (
          <div className="detail-ig">
            {app.published_at ? (
              <>
                <span className="cycle-state cycle-state--open">Опубликовано в Instagram</span>
                {app.instagram_url && (
                  <a href={app.instagram_url} target="_blank" rel="noreferrer" className="detail-ig__link">
                    Открыть пост ↗
                  </a>
                )}
                {app.facebook_url && (
                  <a href={app.facebook_url} target="_blank" rel="noreferrer" className="detail-ig__link">
                    Facebook ↗
                  </a>
                )}
              </>
            ) : (
              <button type="button" className="btn-gold tours-btn" disabled={publishing} onClick={publishIG}>
                {publishing ? '…' : 'Опубликовать в Instagram'}
              </button>
            )}
            {pubMsg && <span className={`cycle-note ${pubMsg.type === 'error' ? 'cycle-note--error' : ''}`}>{pubMsg.text}</span>}
          </div>
        )}

        {app.works?.length > 0 && (
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

        {app.payment_status === 'paid' && tours.map((t) => {
          const tReviews = reviews.filter((r) => (r.tour || 1) === t);
          const reviewedIds = new Set(tReviews.map((r) => r.reviewer_id).filter(Boolean));
          // Pending = current jurors who haven't reviewed (only for the current edition;
          // past editions' jurors are gone, so we rely on the snapshotted review rows).
          const pending = isCurrentEdition ? jurors.filter((j) => !reviewedIds.has(j.id)) : [];
          return (
            <section className="detail-tour" key={t}>
              <div className="detail-tour__head">
                <span className="account-section-label">Жюри · тур {t}</span>
                <Link to={`/account/results/${app.id}/${t}`} className="detail-tour__link">Все оценки →</Link>
              </div>
              <div className="detail-tour__list">
                {tReviews.length === 0 && pending.length === 0 && (
                  <span className="account-app-card__not-reviewed">Нет данных</span>
                )}
                {tReviews.map((r) => {
                  const state = r.status === 'finished' && !r.unlocked ? 'finished' : 'draft';
                  return (
                    <div key={r.id} className="review-row">
                      <span className="review-row__email">
                        <span className="review-row__name">{r.reviewer_name || r.reviewer_email}</span>
                        {r.reviewer_name && <span className="review-row__sub">{r.reviewer_email}</span>}
                      </span>
                      <span className={`review-chip review-chip--${state}`}>
                        {state === 'finished' ? 'Рассмотрено' : 'Черновик'}
                      </span>
                      {state === 'finished' && tourOngoing(t) && (
                        <div className="review-row__actions">
                          <button type="button" className="review-row__btn review-row__btn--ghost" onClick={() => handleUnlock(r.id)}>
                            Разрешить редактирование
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {pending.map((j) => (
                  <div key={j.id} className="review-row">
                    <span className="review-row__email">
                      <span className="review-row__name">{j.name || j.email}</span>
                      {j.name && <span className="review-row__sub">{j.email}</span>}
                    </span>
                    <span className="review-chip review-chip--none">Не рассмотрено</span>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
