import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    <main className="apply-page">
      <div className="container">
        <div className="apply-head">
          <span className="eyebrow">- {t('account.nav')}</span>
          <h1>{t('account.loginTitle')}</h1>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field-group">
            <label>{t('account.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="field-group">
            <label>{t('account.password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="btn-ink" disabled={loading}>
            {loading ? '…' : t('account.signIn')}
          </button>
        </form>
      </div>
    </main>
  );
}
