import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation.jsx';
import { LANGUAGES } from '../i18n';
import { isSupabaseConfigured } from '../lib/supabase.js';

export default function Header() {
  const { lang, setLang, t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Прокрутить к секции на главной (с любого роута)
  const goToSection = (id) => {
    setMenuOpen(false);
    if (location.pathname !== '/') {
      navigate('/', { state: { scrollTo: id } });
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <header className="site-header">
        <div className="container">
          <Link
            to="/"
            className="logo"
            onClick={() => {
              setMenuOpen(false);
              if (location.pathname === '/') window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <em>Eurasian</em> Art Platform
          </Link>

          <nav className="nav-primary" aria-label="Primary">
            <Link to="/process" className={location.pathname === '/process' ? 'active' : ''}>
              {t('nav.process')}
            </Link>
            <a onClick={() => goToSection('team')}>{t('nav.team')}</a>
            <Link to="/faq" className={location.pathname === '/faq' ? 'active' : ''}>
              {t('nav.faq')}
            </Link>
            <a onClick={() => goToSection('contact')}>{t('nav.contact')}</a>
          </nav>

          <div className="header-right">
            <div className="lang-switch" role="group" aria-label="Language">
              {LANGUAGES.map((l, i) => (
                <span key={l.code} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {i > 0 && <span className="sep">/</span>}
                  <button
                    className={lang === l.code ? 'active' : ''}
                    onClick={() => setLang(l.code)}
                    aria-pressed={lang === l.code}
                    title={l.label}
                  >
                    {l.label}
                  </button>
                </span>
              ))}
            </div>

            {isSupabaseConfigured() && (
              <Link to="/login" className={location.pathname === '/login' || location.pathname === '/account' ? 'active' : ''}>
                {t('account.signIn')}
              </Link>
            )}

            <Link to="/apply" className="btn-gold">
              {t('nav.apply')}
            </Link>

            <button
              className="menu-toggle"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              ☰
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="mobile-menu">
          <button className="close" onClick={() => setMenuOpen(false)} aria-label="Close menu">
            ×
          </button>
          <Link to="/process" onClick={() => setMenuOpen(false)}>
            {t('nav.process')}
          </Link>
          <button onClick={() => goToSection('team')}>{t('nav.team')}</button>
          <Link to="/faq" onClick={() => setMenuOpen(false)}>
            {t('nav.faq')}
          </Link>
          <button onClick={() => goToSection('contact')}>{t('nav.contact')}</button>
          {isSupabaseConfigured() && (
            <Link to="/login" onClick={() => setMenuOpen(false)}>
              {t('account.signIn')}
            </Link>
          )}
          <Link to="/apply" onClick={() => setMenuOpen(false)} className="btn-gold" style={{ marginTop: '24px' }}>
            {t('nav.apply')}
          </Link>
        </div>
      )}
    </>
  );
}
