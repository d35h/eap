import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation.jsx';
import { isSupabaseConfigured } from '../lib/supabase.js';
import { signIn } from '../lib/auth.js';

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!isSupabaseConfigured()) {
      setError(t('account.notConfigured'));
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/account');
    } catch {
      setError(t('account.loginError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="apply-page auth-page">
      <div className="auth-card">
        <span className="auth-card__kicker">Eurasian Art Platform</span>
        <h1 className="auth-card__title">{t('account.loginTitle')}</h1>
        <p className="auth-card__sub">{t('account.loginSubtitle')}</p>

        <form onSubmit={handleSubmit} className="auth-card__form" noValidate>
          <div className="auth-field">
            <label htmlFor="login-email">{t('account.email')}</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>
          <div className="auth-field">
            <label htmlFor="login-password">{t('account.password')}</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="auth-card__error" role="alert">{error}</p>}

          <button type="submit" className="auth-card__submit" disabled={loading}>
            {loading ? '…' : t('account.signIn')}
          </button>
        </form>

        <p className="auth-card__foot">
          {t('account.loginNoAccount')}{' '}
          <Link to="/apply">{t('nav.apply')}</Link>
        </p>
      </div>
    </main>
  );
}
