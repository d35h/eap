import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { REVIEW_CRITERIA, MAX_RATING } from '../lib/reviewCriteria.js';
import { getCycle } from '../lib/cycleRepo.js';
import RatingMeter from '../components/RatingMeter.jsx';
import SmartImg from '../components/SmartImg.jsx';
import { imgScaled } from '../lib/img.js';

// Admin-only, read-only view of one juror's evaluation of one application.
export default function ReviewView() {
  const { id, reviewerId, tour } = useParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const isAdmin = user?.app_metadata?.role === 'admin';

  const [app, setApp] = useState(null);
  const [review, setReview] = useState(null);
  const [files, setFiles] = useState({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading || !isSupabaseConfigured()) return;
    if (!user) navigate('/login');
    else if (!isAdmin) navigate('/account');
  }, [user, loading, isAdmin, navigate]);

  useEffect(() => {
    if (!isAdmin || !supabase) return;
    let cancelled = false;
    (async () => {
      let reviewTour = Number(tour);
      if (!Number.isInteger(reviewTour) || reviewTour < 1) {
        const cycle = await getCycle();
        reviewTour = cycle?.active_tour || 1;
      }
      const { data: appRow } = await supabase
        .from('applications').select('*').eq('id', id).maybeSingle();
      const { data: reviewRow } = await supabase
        .from('application_reviews')
        .select('*')
        .eq('application_id', id)
        .eq('reviewer_id', reviewerId)
        .eq('tour', reviewTour)
        .maybeSingle();
      if (cancelled) return;
      setApp(appRow || null);
      setReview(reviewRow || null);
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, [id, reviewerId, tour, isAdmin]);

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

  const scores = review?.scores || {};
  const state = !review
    ? { label: 'Не рассмотрено', cls: 'none' }
    : review.status === 'finished' && !review.unlocked
    ? { label: 'Завершено', cls: 'finished' }
    : review.unlocked
    ? { label: 'Открыто для правок', cls: 'draft' }
    : { label: 'Черновик', cls: 'draft' };
  const total = REVIEW_CRITERIA.reduce((s, c) => s + (Number(scores?.[c.key]?.rating) || 0), 0);

  return (
    <main className="apply-page account-page">
      <div className="container review-page">
        <Link to="/account" className="review-back">← Назад</Link>
        <div className="apply-head">
          <span className="eyebrow">Оценка жюри</span>
          <h1>{review?.reviewer_name || review?.reviewer_email || 'Жюри'}</h1>
        </div>
        <div className="detail-id">
          {review?.reviewer_email && <span className="detail-id__email">{review.reviewer_email}</span>}
          <span className={`review-chip review-chip--${state.cls}`}>{state.label}</span>
        </div>

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

        {ready && !review && (
          <div className="empty-state">
            <p className="empty-state__title">Оценка не оставлена</p>
            <p className="empty-state__sub">Этот член жюри ещё не оценил эту заявку.</p>
          </div>
        )}

        {ready && review && (
          <section className="jcard">
            <header className="jcard__head">
              <span className="jcard__name">Оценка</span>
              <span className="jcard__total">{total} / {REVIEW_CRITERIA.length * MAX_RATING}</span>
            </header>
            {REVIEW_CRITERIA.map((c) => {
              const e = scores[c.key];
              return (
                <div className="jcard__crit" key={c.key}>
                  <span className="jcard__crit-title">{c.title}</span>
                  <RatingMeter value={Number.isInteger(e?.rating) ? e.rating : 0} disabled />
                  <p className="jcard__comment">{e?.text || '—'}</p>
                </div>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
