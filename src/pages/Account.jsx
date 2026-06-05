import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { isSupabaseConfigured, supabase } from '../lib/supabase.js';
import { signOut } from '../lib/auth.js';

export default function Account() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const isAdmin = user?.app_metadata?.role === 'admin';
  const [applications, setApplications] = useState([]);
  const [appsLoading, setAppsLoading] = useState(false);
  // app.id → { <workNumber>: signedUrl } for the uploaded work files.
  const [filesByApp, setFilesByApp] = useState({});

  useEffect(() => {
    if (!loading && !user && isSupabaseConfigured()) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user || !supabase) return;
    setAppsLoading(true);
    // Admins read every application; regular users only their own.
    // RLS enforces this server-side too - the filter is just intent.
    let query = supabase.from('applications').select('*').order('created_at', { ascending: false });
    if (!isAdmin) query = query.eq('user_id', user.id);
    query
      .then(({ data }) => {
        setApplications(data || []);
        setAppsLoading(false);
      })
      .catch(() => setAppsLoading(false));
  }, [user, isAdmin]);

  const markReviewed = async (id) => {
    if (!supabase) return;
    const { error } = await supabase
      .from('applications')
      .update({ review_status: 'reviewed' })
      .eq('id', id);
    if (!error) {
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, review_status: 'reviewed' } : a))
      );
    }
  };

  // Mint short-lived signed URLs for each application's uploaded work files.
  // Bucket is private; an owner-only SELECT policy lets us list + sign here.
  useEffect(() => {
    if (!user || !supabase || applications.length === 0) return;
    let cancelled = false;
    (async () => {
      const map = {};
      for (const app of applications) {
        const folder = `applications/${app.id}`;
        const { data: list } = await supabase.storage.from('works').list(folder);
        if (!list || list.length === 0) continue;
        const paths = list.map((f) => `${folder}/${f.name}`);
        const { data: signed } = await supabase.storage
          .from('works')
          .createSignedUrls(paths, 3600);
        const byNumber = {};
        (signed || []).forEach((s, i) => {
          if (!s?.signedUrl) return;
          const m = /^work(\d+)\./.exec(list[i].name);
          if (m) byNumber[Number(m[1])] = s.signedUrl;
        });
        map[app.id] = byNumber;
      }
      if (!cancelled) setFilesByApp(map);
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [applications, user]);

  if (!isSupabaseConfigured()) {
    return (
      <main className="apply-page">
        <div className="container">
          <p className="eyebrow">- {t('account.nav')}</p>
          <p>{t('account.notConfigured')}</p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="apply-page">
        <div className="container">
          <p>…</p>
        </div>
      </main>
    );
  }

  if (!user) return null;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <main className="apply-page">
      <div className="container">
        <div className="apply-head">
          <span className="eyebrow">- {t('account.nav')}</span>
          <h1>{t('account.cabinetTitle')}</h1>
        </div>
        <p style={{ marginBottom: '16px', opacity: 0.7 }}>{user.email}</p>
        <button className="btn-ink" onClick={handleSignOut} style={{ marginBottom: '48px' }}>
          {t('account.signOut')}
        </button>

        <h2 style={{ marginBottom: '24px' }}>
          {isAdmin ? t('account.allApplications') : t('account.yourApplications')}
        </h2>

        {appsLoading && <p>…</p>}

        {!appsLoading && applications.length === 0 && (
          <p>{t('account.noApplications')}</p>
        )}

        {!appsLoading && applications.map((app) => (
          <div key={app.id} className="account-app-card">
            <div className="account-app-card__meta">
              <span className="account-app-card__ref">{app.payment_ref || app.id}</span>
              <span className={`account-app-card__status account-app-card__status--${app.payment_status}`}>
                {app.payment_status === 'paid' ? t('account.statusPaid') : t('account.statusPending')}
              </span>
              {app.payment_status === 'paid' && (
                <span className={`account-app-card__status account-app-card__status--review-${app.review_status === 'reviewed' ? 'reviewed' : 'in_review'}`}>
                  {app.review_status === 'reviewed' ? t('account.statusReviewed') : t('account.statusInReview')}
                </span>
              )}
            </div>
            {isAdmin && (
              <div className="account-app-card__applicant">
                {[app.first_name, app.last_name].filter(Boolean).join(' ')}
                {app.email ? ` · ${app.email}` : ''}
              </div>
            )}
            {app.works && app.works.length > 0 && (
              <ul className="account-app-card__works">
                {app.works.map((w, i) => {
                  const url = filesByApp[app.id]?.[i + 1];
                  return (
                    <li key={i} className="account-work">
                      {url ? (
                        <a href={url} target="_blank" rel="noreferrer" className="account-work__thumb">
                          <img src={url} alt={w.title || ''} loading="lazy" />
                        </a>
                      ) : (
                        <span className="account-work__thumb account-work__thumb--empty" aria-hidden="true" />
                      )}
                      <span className="account-work__meta">
                        {w.title || `-`}{w.year ? `, ${w.year}` : ''}{w.media ? ` · ${w.media}` : ''}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            {isAdmin && app.payment_status === 'paid' && app.review_status !== 'reviewed' && (
              <button
                type="button"
                className="btn-ink account-app-card__action"
                onClick={() => markReviewed(app.id)}
              >
                {t('account.markReviewed')}
              </button>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
