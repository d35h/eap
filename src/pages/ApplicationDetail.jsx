import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { getCycle } from '../lib/cycleRepo.js';
import { unlockReview } from '../lib/reviewsRepo.js';

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
      <main className="apply-page"><div className="container">
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
    setPubMsg(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/.netlify/functions/ig-publish-one', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ applicationId: id }),
      });
      const d = await res.json().catch(() => ({}));
      if (d.status === 'published' || d.status === 'already_published') {
        setPubMsg({ type: 'ok', text: d.status === 'published' ? 'Опубликовано в Instagram.' : 'Уже опубликовано.' });
        setRefresh((r) => r + 1);
      } else if (d.status === 'skipped') {
        setPubMsg({ type: 'error', text: 'Пропущено: нет JPEG-изображений.' });
        setRefresh((r) => r + 1);
      } else if (d.status === 'no_token') {
        setPubMsg({ type: 'error', text: 'Instagram не настроен.' });
      } else {
        setPubMsg({ type: 'error', text: 'Ошибка публикации.' });
      }
    } catch {
      setPubMsg({ type: 'error', text: 'Ошибка публикации.' });
    } finally {
      setPublishing(false);
    }
  };

  const applicant = [app.first_name, app.last_name].filter(Boolean).join(' ') || '—';
  const info = [
    app.country, app.city, app.website, app.instagram,
  ].filter(Boolean).join(' · ');

  return (
    <main className="apply-page">
      <div className="container">
        <Link to="/account" className="review-back">← Назад</Link>
        <div className="apply-head">
          <span className="eyebrow">- Заявка</span>
          <h1>{applicant}</h1>
        </div>
        <p style={{ opacity: 0.7, marginTop: '-8px' }}>
          {app.email}
          <span className={`account-app-card__status account-app-card__status--${app.payment_status}`} style={{ marginLeft: '12px' }}>
            {app.payment_status === 'paid' ? 'Оплачено' : 'Ожидает оплаты'}
          </span>
        </p>
        {info && <p style={{ opacity: 0.6, fontSize: '14px' }}>{info}</p>}

        {app.payment_status === 'paid' && (
          <div className="detail-ig">
            {app.published_at ? (
              <span className="cycle-state cycle-state--open">Опубликовано в Instagram</span>
            ) : (
              <button type="button" className="btn-gold tours-btn" disabled={publishing} onClick={publishIG}>
                {publishing ? '…' : 'Опубликовать в Instagram'}
              </button>
            )}
            {pubMsg && <span className={`cycle-note ${pubMsg.type === 'error' ? 'cycle-note--error' : ''}`}>{pubMsg.text}</span>}
          </div>
        )}

        {app.works?.length > 0 && (
          <div className="review-works" style={{ marginTop: '24px' }}>
            {app.works.map((w, i) => {
              const url = files[i + 1];
              return (
                <figure className="review-work" key={i}>
                  {url ? (
                    <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={w.title || ''} loading="lazy" /></a>
                  ) : (
                    <div className="review-work__noimg">Нет изображения</div>
                  )}
                  <figcaption>
                    <strong>{w.title || '-'}</strong>
                    {w.year ? `, ${w.year}` : ''}{w.media ? ` · ${w.media}` : ''}{w.size ? ` · ${w.size}` : ''}
                    {w.desc ? <p>{w.desc}</p> : null}
                  </figcaption>
                </figure>
              );
            })}
          </div>
        )}

        {app.payment_status === 'paid' && tours.map((t) => {
          const tReviews = reviews.filter((r) => (r.tour || 1) === t);
          return (
            <div className="detail-tour" key={t}>
              <span className="account-section-label">Жюри · тур {t}</span>
              <div className="account-app-card__reviews">
                {jurors.length === 0 && <span className="account-app-card__not-reviewed">Нет приглашённых жюри</span>}
                {jurors.map((j) => {
                  const r = tReviews.find((x) => x.reviewer_id === j.id) || null;
                  const state = !r ? 'none' : r.status === 'finished' && !r.unlocked ? 'finished' : 'draft';
                  return (
                    <div key={j.id} className="review-row">
                      <span className="review-row__email">
                        <span className="review-row__name">{j.name || j.email}</span>
                        {j.name && <span className="review-row__sub">{j.email}</span>}
                      </span>
                      <span className={`review-chip review-chip--${state}`}>
                        {state === 'finished' ? 'Рассмотрено' : state === 'draft' ? 'Черновик' : 'Не рассмотрено'}
                      </span>
                      {r && r.status === 'finished' && !r.unlocked && tourOngoing(t) && (
                        <div className="review-row__actions">
                          <button type="button" className="review-row__btn review-row__btn--ghost" onClick={() => handleUnlock(r.id)}>
                            Разрешить редактирование
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <Link to={`/account/results/${app.id}/${t}`} className="btn-ink account-app-card__action">
                Оценки жюри · тур {t}
              </Link>
            </div>
          );
        })}
      </div>
    </main>
  );
}
