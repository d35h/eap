import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { REVIEW_CRITERIA, MAX_RATING } from '../lib/reviewCriteria.js';
import { getCycle } from '../lib/cycleRepo.js';

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
  const stateLabel = !review
    ? 'Не рассмотрено'
    : review.status === 'finished' && !review.unlocked
    ? 'Завершено'
    : review.unlocked
    ? 'Открыто для правок'
    : 'Черновик';

  return (
    <main className="apply-page">
      <div className="container">
        <Link to="/account" className="review-back">← Назад</Link>
        <div className="apply-head">
          <span className="eyebrow">- Оценка жюри</span>
          <h1>{review?.reviewer_name || review?.reviewer_email || 'Жюри'}</h1>
          {review?.reviewer_name && <p style={{ opacity: 0.6, marginTop: '-8px' }}>{review.reviewer_email}</p>}
        </div>

        {app && (
          <div className="review-app">
            <div className="review-app__applicant">
              {[app.first_name, app.last_name].filter(Boolean).join(' ')}
              {app.email ? ` · ${app.email}` : ''} · <strong>{stateLabel}</strong>
            </div>
            {app.works && app.works.length > 0 && (
              <div className="review-works">
                {app.works.map((w, i) => {
                  const url = files[i + 1];
                  return (
                    <figure className="review-work" key={i}>
                      {url ? (
                        <a href={url} target="_blank" rel="noreferrer">
                          <img src={url} alt={w.title || ''} loading="lazy" />
                        </a>
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
          </div>
        )}

        {ready && !review && <p>Этот жюри ещё не оставил оценку.</p>}

        {ready && review && (
          <div className="reviewview">
            {REVIEW_CRITERIA.map((c) => {
              const e = scores[c.key];
              return (
                <div className="reviewview-crit" key={c.key}>
                  <div className="reviewview-crit__head">
                    <h3>{c.title}</h3>
                    <span className="reviewview-crit__rating">
                      {Number.isInteger(e?.rating) ? e.rating : '-'} / {MAX_RATING}
                    </span>
                  </div>
                  <p className="reviewview-crit__text">{e?.text || '—'}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
