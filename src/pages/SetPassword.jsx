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
    <main className="apply-page">
      <div className="container">
        <p className="eyebrow">- {t('account.nav')}</p>
        <h1>{t('account.setPasswordTitle')}</h1>
        <form onSubmit={handleSubmit} style={{ maxWidth: '400px', marginTop: '32px' }}>
          <div className="field-group">
            <label>{t('account.password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPasswordValue(e.target.value)}
              required
              autoComplete="new-password"
              minLength={6}
            />
          </div>
          {error && <p style={{ color: 'var(--red, #c0392b)', marginBottom: '16px' }}>{error}</p>}
          <button type="submit" className="btn-ink" disabled={loading}>
            {loading ? '…' : t('account.setPasswordBtn')}
          </button>
        </form>
      </div>
    </main>
  );
}
