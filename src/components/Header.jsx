import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation.jsx';
import { LANGUAGES } from '../i18n';
import { isSupabaseConfigured, supabase } from '../lib/supabase.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { signOut } from '../lib/auth.js';
import { useSubmissionsOpen } from '../lib/useSubmissionsOpen.js';

export default function Header() {
  const { lang, setLang, t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const submOpen = useSubmissionsOpen(); // undefined = loading, then true/false
  const accountRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Resolve the user's display name: jurors/admin carry it in app_metadata; for
  // artists it lives on their application, so fetch the most recent one.
  useEffect(() => {
    const metaName = user?.app_metadata?.name || user?.user_metadata?.name;
    if (metaName) { setDisplayName(metaName); return; }
    if (!user || !supabase) { setDisplayName(''); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('applications').select('first_name, last_name')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (cancelled) return;
      const n = [data?.first_name, data?.last_name].filter(Boolean).join(' ');
      setDisplayName(n);
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Close the account dropdown on outside click
  useEffect(() => {
    if (!accountMenuOpen) return;
    const onDocClick = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) setAccountMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [accountMenuOpen]);

  const handleLogout = async () => {
    setAccountMenuOpen(false);
    setMenuOpen(false);
    await signOut();
    navigate('/');
  };

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

            {isSupabaseConfigured() && !authLoading && (
              user ? (
                <div className="account-menu" ref={accountRef}>
                  <button
                    type="button"
                    className={`account-avatar ${accountMenuOpen ? 'open' : ''}`}
                    onClick={() => setAccountMenuOpen((o) => !o)}
                    aria-label={t('account.nav')}
                    aria-expanded={accountMenuOpen}
                    title={displayName || user.email}
                  >
                    {(displayName || user.email || '?').charAt(0).toUpperCase()}
                  </button>
                  {accountMenuOpen && (
                    <div className="account-dropdown">
                      <div className="account-dropdown-id">
                        {displayName && <span className="account-dropdown-name">{displayName}</span>}
                        <span className="account-dropdown-email">{user.email}</span>
                      </div>
                      <Link to="/account" className="account-dropdown-item" onClick={() => setAccountMenuOpen(false)}>
                        {t('account.nav')}
                      </Link>
                      <button type="button" className="account-dropdown-item" onClick={handleLogout}>
                        {t('account.signOut')}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link to="/login" className={`header-login ${location.pathname === '/login' ? 'active' : ''}`}>
                  {t('account.signIn')}
                </Link>
              )
            )}

            {!authLoading && !user && submOpen !== undefined && (
              submOpen ? (
                <Link to="/apply" className="btn-gold header-apply">
                  {t('nav.apply')}
                </Link>
              ) : (
                <span
                  className="header-apply header-apply--closed"
                  aria-disabled="true"
                  title={t('opencall.closedTitle')}
                >
                  {t('nav.applyClosed')}
                </span>
              )
            )}

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
          {isSupabaseConfigured() && !authLoading && (
            user ? (
              <>
                <Link to="/account" onClick={() => setMenuOpen(false)}>{t('account.nav')}</Link>
                <button onClick={handleLogout}>{t('account.signOut')}</button>
              </>
            ) : (
              <Link to="/login" onClick={() => setMenuOpen(false)}>{t('account.signIn')}</Link>
            )
          )}
          {!authLoading && !user && submOpen !== undefined && (
            submOpen ? (
              <Link to="/apply" onClick={() => setMenuOpen(false)} className="btn-gold" style={{ marginTop: '24px' }}>
                {t('nav.apply')}
              </Link>
            ) : (
              <span className="mobile-menu__closed" aria-disabled="true" style={{ marginTop: '24px' }}>
                {t('opencall.closedTitle')}
              </span>
            )
          )}
          <div className="mobile-menu__lang" role="group" aria-label="Language">
            {LANGUAGES.map((l, i) => (
              <span key={l.code} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                {i > 0 && <span className="sep">/</span>}
                <button
                  className={lang === l.code ? 'active' : ''}
                  onClick={() => setLang(l.code)}
                  aria-pressed={lang === l.code}
                >
                  {l.label}
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
