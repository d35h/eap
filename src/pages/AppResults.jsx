import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { REVIEW_CRITERIA, MAX_RATING } from '../lib/reviewCriteria.js';
import RatingMeter from '../components/RatingMeter.jsx';

// Admin-only: detailed results for one application in one tour - every juror's
// points + feedback per criterion.
export default function AppResults() {
  const { id, tour } = useParams();
  const t = Number(tour) || 1;
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const isAdmin = user?.app_metadata?.role === 'admin';

  const [app, setApp] = useState(null);
  const [reviews, setReviews] = useState([]);
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
      const { data: appRow } = await supabase.from('applications').select('*').eq('id', id).maybeSingle();
      const { data: revs } = await supabase
        .from('application_reviews')
        .select('*')
        .eq('application_id', id)
        .eq('tour', t)
        .eq('status', 'finished');
      if (cancelled) return;
      setApp(appRow || null);
      setReviews(revs || []);
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, [id, t, isAdmin]);

  if (!isSupabaseConfigured() || loading || !user || !isAdmin) return null;

  const applicant = app
    ? [app.first_name, app.last_name].filter(Boolean).join(' ') || app.email || ''
    : '';

  return (
    <main className="apply-page account-page">
      <div className="container review-page">
        <Link to="/account" className="review-back">← Назад</Link>
        <div className="apply-head">
          <span className="eyebrow">Оценки жюри · тур {t}</span>
          <h1>{applicant}</h1>
        </div>
        {app?.email && <p className="detail-id__email" style={{ marginTop: '-4px' }}>{app.email}</p>}

        {ready && reviews.length === 0 && (
          <div className="empty-state">
            <p className="empty-state__title">Пока нет завершённых оценок</p>
            <p className="empty-state__sub">Когда жюри завершит оценку этой заявки в туре {t}, баллы и комментарии появятся здесь.</p>
          </div>
        )}

        {ready && reviews.length > 0 && (
          <div className="jcards">
            {reviews.map((r) => {
              const total = REVIEW_CRITERIA.reduce((s, c) => s + (Number(r.scores?.[c.key]?.rating) || 0), 0);
              return (
                <section className="jcard" key={r.id}>
                  <header className="jcard__head">
                    <span className="jcard__name">{r.reviewer_name || r.reviewer_email}</span>
                    <span className="jcard__total">{total} / {REVIEW_CRITERIA.length * MAX_RATING}</span>
                  </header>
                  {REVIEW_CRITERIA.map((c) => {
                    const e = r.scores?.[c.key];
                    return (
                      <div className="jcard__crit" key={c.key}>
                        <span className="jcard__crit-title">{c.title}</span>
                        <RatingMeter value={Number.isInteger(e?.rating) ? e.rating : 0} disabled />
                        <p className="jcard__comment">{e?.text || '—'}</p>
                      </div>
                    );
                  })}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
