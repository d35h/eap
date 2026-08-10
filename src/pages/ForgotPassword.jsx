import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation.jsx';
import { isSupabaseConfigured } from '../lib/supabase.js';
import { requestPasswordReset } from '../lib/auth.js';

export default function ForgotPassword() {
  const { t, lang } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!isSupabaseConfigured()) { setError(t('account.notConfigured')); return; }
    setLoading(true);
    try {
      await requestPasswordReset(email, lang);
      setSent(true); // neutral confirmation regardless of whether the email exists
    } catch {
      // Don't leak whether the account exists — show the same confirmation.
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="apply-page auth-page">
      <div className="auth-card">
        <span className="auth-card__kicker">Eurasia Art Platform</span>

        {sent ? (
          <>
            <div className="auth-card__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="2.5" />
                <path d="m3.5 7 8.5 6 8.5-6" />
              </svg>
            </div>
            <h1 className="auth-card__title">{t('account.forgotSentTitle')}</h1>
            <p className="auth-card__sub">{t('account.forgotSentBody')}</p>
            {email.trim() && <p className="auth-card__sent-email">{email.trim().toLowerCase()}</p>}
            <Link to="/login" className="auth-card__submit auth-card__submit--ghost">
              ← {t('account.forgotBack')}
            </Link>
          </>
        ) : (
          <>
            <h1 className="auth-card__title">{t('account.forgotTitle')}</h1>
            <p className="auth-card__sub">{t('account.forgotSubtitle')}</p>

            <form onSubmit={handleSubmit} className="auth-card__form" noValidate>
              <div className="auth-field">
                <label htmlFor="forgot-email">{t('account.email')}</label>
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                  placeholder="you@example.com"
                />
              </div>

              {error && <p className="auth-card__error" role="alert">{error}</p>}

              <button type="submit" className="auth-card__submit" disabled={loading}>
                {loading ? '…' : t('account.forgotBtn')}
              </button>
            </form>

            <p className="auth-card__foot">
              <Link to="/login">← {t('account.forgotBack')}</Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
