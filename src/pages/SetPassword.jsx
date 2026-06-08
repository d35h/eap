import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation.jsx';
import { isSupabaseConfigured } from '../lib/supabase.js';
import { setPassword } from '../lib/auth.js';

export default function SetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [password, setPasswordValue] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await setPassword(password);
      navigate('/account');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="apply-page auth-page">
      <div className="auth-card">
        <span className="auth-card__kicker">Eurasian Art Platform</span>
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

          <button type="submit" className="auth-card__submit" disabled={loading}>
            {loading ? '…' : t('account.setPasswordBtn')}
          </button>
        </form>
      </div>
    </main>
  );
}
