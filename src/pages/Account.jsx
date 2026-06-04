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
  const [applications, setApplications] = useState([]);
  const [appsLoading, setAppsLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user && isSupabaseConfigured()) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user || !supabase) return;
    setAppsLoading(true);
    supabase
      .from('applications')
      .select('*')
      .eq('user_id', user.id)
      .then(({ data }) => {
        setApplications(data || []);
        setAppsLoading(false);
      })
      .catch(() => setAppsLoading(false));
  }, [user]);

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
        <p className="eyebrow">- {t('account.nav')}</p>
        <h1>{t('account.cabinetTitle')}</h1>
        <p style={{ marginBottom: '8px', opacity: 0.7 }}>{user.email}</p>
        <button className="btn-ink" onClick={handleSignOut} style={{ marginBottom: '40px' }}>
          {t('account.signOut')}
        </button>

        <h2 style={{ marginBottom: '24px' }}>{t('account.yourApplications')}</h2>

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
            </div>
            {app.works && app.works.length > 0 && (
              <ul className="account-app-card__works">
                {app.works.map((w, i) => (
                  <li key={i}>{w.title || `-`}{w.year ? `, ${w.year}` : ''}{w.media ? ` · ${w.media}` : ''}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
