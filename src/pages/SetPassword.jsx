import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation.jsx';
import OrganicCta from '../components/OrganicCta.jsx';
import { isSupabaseConfigured, supabase } from '../lib/supabase.js';
import { setPassword } from '../lib/auth.js';

export default function SetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [password, setPasswordValue] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // null while the client is still reading the session out of the invite link.
  const [hasSession, setHasSession] = useState(null);

  useEffect(() => {
    if (!supabase) return undefined;
    let cancelled = false;
    // getSession settles only after the link's fragment has been consumed, so
    // this cannot mistake "still loading" for "no session".
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setHasSession(Boolean(data?.session));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!cancelled) setHasSession(Boolean(session));
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  if (!isSupabaseConfigured()) {
    return (
      <main className="apply-page">
        <div className="container">
          <p className="eyebrow">{t('account.nav')}</p>
          <p>{t('account.notConfigured')}</p>
        </div>
      </main>
    );
  }

  // No session means the link was already used, expired, or opened on a host
  // the session was never established on. Say that, and offer the way out -
  // "Auth session missing!" told an invited juror nothing at all.
  if (hasSession === false) {
    return (
      <main className="apply-page auth-page">
        <div className="auth-card">
          <span className="auth-card__kicker">Eurasia Art Platform</span>
          <h1 className="auth-card__title">{t('account.setPasswordTitle')}</h1>
          <p className="auth-card__sub">{t('account.setPasswordExpired')}</p>
          <Link to="/forgot-password" className="auth-card__submit auth-card__submit--ghost">
            {t('account.forgotBtn')}
          </Link>
        </div>
      </main>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await setPassword(password);
      navigate('/account');
    } catch (err) {
      // Supabase phrases a missing session as "Auth session missing!", which is
      // not something to show an artist who just followed an invitation.
      setError(/session missing/i.test(err.message) ? t('account.setPasswordExpired') : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="apply-page auth-page">
      <div className="auth-card">
        <span className="auth-card__kicker">Eurasia Art Platform</span>
        <h1 className="auth-card__title">{t('account.setPasswordTitle')}</h1>
        <p className="auth-card__sub">{t('account.setPasswordSubtitle')}</p>

        <form onSubmit={handleSubmit} className="auth-card__form" noValidate>
          <div className="auth-field">
            <label htmlFor="set-password">{t('account.password')}</label>
            <input
              id="set-password"
              type="password"
              value={password}
              onChange={(e) => setPasswordValue(e.target.value)}
              required
              autoComplete="new-password"
              minLength={6}
              placeholder="••••••••"
            />
          </div>

          {error && <p className="auth-card__error" role="alert">{error}</p>}

          <OrganicCta type="submit" disabled={loading} className="auth-card__submit">
            {loading ? '…' : t('account.setPasswordBtn')}
          </OrganicCta>
        </form>
      </div>
    </main>
  );
}
