import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { REVIEW_CRITERIA, MAX_RATING } from '../lib/reviewCriteria.js';

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
      <div className="container">
        <Link to="/account" className="review-back">← Назад</Link>
        <div className="apply-head">
          <span className="eyebrow">- Результаты · тур {t}</span>
          <h1>{applicant}</h1>
        </div>
        {app?.email && <p style={{ opacity: 0.6, marginTop: '-8px' }}>{app.email}</p>}

        {ready && reviews.length === 0 && <p>Нет завершённых оценок за этот тур.</p>}

        {ready && reviews.map((r) => (
          <div className="appresults-juror" key={r.id}>
            <h3 className="panel-title">{r.reviewer_name || r.reviewer_email}</h3>
            {REVIEW_CRITERIA.map((c) => {
              const e = r.scores?.[c.key];
              return (
                <div className="appresults-crit" key={c.key}>
                  <div className="appresults-crit__head">
                    <strong>{c.title}</strong>
                    <span className="appresults-crit__score">
                      {Number.isInteger(e?.rating) ? e.rating : '—'} / {MAX_RATING}
                    </span>
                  </div>
                  <p className="appresults-crit__text">{e?.text || '—'}</p>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </main>
  );
}
