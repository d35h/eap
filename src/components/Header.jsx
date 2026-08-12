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
  const [langSheetOpen, setLangSheetOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const submOpen = useSubmissionsOpen(); // undefined = loading, then true/false
  const accountRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Transparent while the opening screen is genuinely behind the bar, opaque
  // the instant it is not. Driven by an observer on the hero rather than by a
  // scroll threshold: the threshold was a guess at the hero's height and drifted
  // on any viewport it had not been tuned on, leaving a band where content
  // scrolled under a see-through bar.
  const [overOrb, setOverOrb] = useState(false);
  useEffect(() => {
    if (location.pathname !== '/') { setOverOrb(false); return undefined; }
    let io;
    // The hero belongs to the route, which mounts after this bar does.
    const attach = () => {
      const hero = document.querySelector('.ed-hero');
      if (!hero) return false;
      io = new IntersectionObserver(
        ([entry]) => setOverOrb(entry.isIntersecting),
        { rootMargin: '-72px 0px 0px 0px', threshold: 0 },
      );
      io.observe(hero);
      return true;
    };
    if (!attach()) {
      const raf = requestAnimationFrame(() => { attach(); });
      return () => { cancelAnimationFrame(raf); io?.disconnect(); };
    }
    return () => io?.disconnect();
  }, [location.pathname]);

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

  // Lock body scroll while a full-screen overlay (menu or language sheet) is open,
  // so the page underneath can't move.
  useEffect(() => {
    const locked = menuOpen || langSheetOpen;
    document.body.style.overflow = locked ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen, langSheetOpen]);

  const chooseLang = (code) => { setLang(code); setLangSheetOpen(false); };
  const currentLang = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

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
      <header className={`site-header${overOrb ? ' site-header--over-orb' : ''}`}>
        <div className="container">
          <Link
            to="/"
            className="logo"
            onClick={() => {
              setMenuOpen(false);
              if (location.pathname === '/') window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <span className="logo__full"><em>Eurasia</em> Art Platform</span>
            <span className="logo__short" aria-hidden="true">EAP</span>
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
                <Link to="/apply" className={`btn-gold header-apply${overOrb ? ' is-hidden' : ''}`}>
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
              type="button"
              className="lang-globe"
              onClick={() => setLangSheetOpen(true)}
              aria-label="Сменить язык · Change language"
              aria-haspopup="dialog"
            >
              <svg className="lang-globe__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
              </svg>
              <span className="lang-globe__code">{currentLang.name}</span>
              <svg className="lang-globe__chev" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            <button
              className="menu-toggle"
              onClick={() => setMenuOpen(true)}
              aria-label="Меню · Menu"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="mobile-menu">
          <button className="close" onClick={() => setMenuOpen(false)} aria-label="Закрыть · Close">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
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
              <Link to="/apply" onClick={() => setMenuOpen(false)} className="btn-gold mm-apply">
                <span>{t('nav.apply')}</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            ) : (
              <span className="mobile-menu__closed" aria-disabled="true" style={{ marginTop: '24px' }}>
                {t('opencall.closedTitle')}
              </span>
            )
          )}
          <button
            type="button"
            className="mobile-menu__langbtn"
            onClick={() => { setMenuOpen(false); setLangSheetOpen(true); }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
            </svg>
            <span>Язык · Language</span>
            <span className="mobile-menu__langbtn-cur">{currentLang.name}</span>
          </button>
        </div>
      )}

      {langSheetOpen && (
        <div className="lang-sheet-backdrop" onClick={() => setLangSheetOpen(false)}>
          <div
            className="lang-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Выберите язык"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="lang-sheet__handle" aria-hidden="true" />
            <span className="lang-sheet__title">Выберите язык&ensp;·&ensp;Choose language</span>
            <div className="lang-sheet__list">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  className={`lang-sheet__row ${lang === l.code ? 'active' : ''}`}
                  onClick={() => chooseLang(l.code)}
                  aria-pressed={lang === l.code}
                >
                  <span className="lang-sheet__name">{l.name}</span>
                  <span className="lang-sheet__code">{l.label}</span>
                  <span className="lang-sheet__check" aria-hidden="true">
                    {lang === l.code && (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
