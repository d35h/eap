import { useEffect, useState, Fragment } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { isSupabaseConfigured, supabase } from '../lib/supabase.js';
import { signOut } from '../lib/auth.js';
import { unlockReview } from '../lib/reviewsRepo.js';
import AdminCyclePanel from '../components/AdminCyclePanel.jsx';
import AdminToursPanel from '../components/AdminToursPanel.jsx';
import { getCycle, submissionsOpen } from '../lib/cycleRepo.js';
import EditionTourResults from '../components/EditionTourResults.jsx';

// Medal for top-3 placements.
const medal = (p) => (p === 1 ? '🥇' : p === 2 ? '🥈' : p === 3 ? '🥉' : '🏆');

const PAGE_SIZE = 25;

export default function Account() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const role = user?.app_metadata?.role;
  const isAdmin = role === 'admin';
  const isJuror = role === 'juror';
  const isStaff = isAdmin || isJuror;
  // The staff cabinet is Russian-only; artists see their selected language.
  const L = (key, ru) => (isStaff ? ru : t(`account.${key}`));

  const [applications, setApplications] = useState([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  // Admin "Все заявки" filters.
  const [searchQ, setSearchQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [payFilter, setPayFilter] = useState('all');
  const [evalFilter, setEvalFilter] = useState('all');
  // App ids fully evaluated in the active tour (all jurors finished).
  const [evaluatedIds, setEvaluatedIds] = useState([]);
  // app.id → { <workNumber>: signedUrl } for the uploaded work files.
  const [filesByApp, setFilesByApp] = useState({});
  // app.id → [{ reviewer_id, reviewer_email, status, ... }] (review rows).
  const [reviewsByApp, setReviewsByApp] = useState({});
  // All jurors in the system [{ id, email }] (admin only).
  const [jurors, setJurors] = useState([]);
  // Artist's own published results: app.id → [{ tour, outcome, feedback }].
  const [myResults, setMyResults] = useState({});
  // Current edition as seen by the artist (to split current vs past applications).
  const [artistEdition, setArtistEdition] = useState(null);
  // Whether submissions are currently open (for the artist apply CTA).
  const [subsOpen, setSubsOpen] = useState(false);
  // Which tour tab the artist is viewing, per application.
  const [artistTab, setArtistTab] = useState({});
  // Cycle (submissions + tours); active tour is derived from it. Single source
  // of truth shared by both admin panels so they never go out of sync.
  const [cycle, setCycle] = useState(null);
  const activeTour = cycle?.active_tour || 1;
  const currentEdition = cycle?.current_edition || 1;
  // Jurors can only see/evaluate once the active tour's evaluations are open.
  const evaluationsOpen = activeTour === 1 ? !!cycle?.tour1_open : !!cycle?.tour2_open;
  // Admin can switch which tour's results they're viewing; defaults to active.
  const [viewTour, setViewTour] = useState(null);
  const shownTour = viewTour ?? activeTour;
  // Admin can browse past editions; defaults to the current one.
  const [viewEdition, setViewEdition] = useState(null);
  const shownEdition = viewEdition ?? currentEdition;
  const isCurrentEdition = shownEdition === currentEdition;
  const [showArchive, setShowArchive] = useState(false);
  const [editionYears, setEditionYears] = useState({}); // edition → year
  const [archiveTab, setArchiveTab] = useState('apps'); // 'apps' | 1 | 2
  const archiveMode = isAdmin && showArchive && !isCurrentEdition;
  // Bumped after any change to refetch cycle/applications/reviews.
  const [refreshKey, setRefreshKey] = useState(0);
  // True once the current edition has winners (cycle finished).
  const [cycleFinished, setCycleFinished] = useState(false);

  // Invite jury (admin only).
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState(null); // { type, text }

  useEffect(() => {
    if (!loading && !user && isSupabaseConfigured()) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user || !supabase) return;
    // Staff: wait for the cycle so the edition filter is correct (avoids a
    // race where the default edition=1 query lands after the real one).
    if (isStaff && !cycle) {
      setAppsLoading(true);
      return;
    }
    // Jurors get nothing until their tour's evaluations are open.
    if (isJuror && !evaluationsOpen) {
      setApplications([]);
      setAppsLoading(false);
      return;
    }
    let cancelled = false;
    setAppsLoading(true);
    // Staff read every application; regular users only their own.
    // RLS enforces this server-side too - the filter is just intent.
    let query = supabase
      .from('applications')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });
    // Admin: all (the Tours panel needs every standing/tour).
    // Juror: only paid + still-active applications in the current tour.
    // Artist: only their own.
    if (isJuror) {
      query = query
        .eq('payment_status', 'paid')
        .eq('standing', 'active')
        .eq('tour', activeTour);
    } else if (!isAdmin) {
      query = query.eq('user_id', user.id);
    }
    // Staff see the selected edition (current by default; past = archive).
    if (isStaff) {
      query = query.eq('edition', shownEdition);
      if (debouncedQ) {
        // Each word must appear in name or email (so "Daniil Zaru" matches
        // first_name "Daniil" + last_name "Zaru"). Repeated .or() calls AND together.
        debouncedQ.split(/\s+/).filter(Boolean).forEach((word) => {
          const w = word.replace(/[%,()]/g, ' ');
          query = query.or(`first_name.ilike.%${w}%,last_name.ilike.%${w}%,email.ilike.%${w}%`);
        });
      }
      // Payment + review filters apply only to the current edition (archive = search only).
      if (isCurrentEdition) {
        if (payFilter !== 'all') query = query.eq('payment_status', payFilter);
        // Reviewed = fully reviewed in the active tour (all jurors finished).
        if (evalFilter === 'reviewed') {
          query = query.in('id', evaluatedIds.length ? evaluatedIds : ['00000000-0000-0000-0000-000000000000']);
        } else if (evalFilter === 'in_review' && evaluatedIds.length) {
          query = query.not('id', 'in', `(${evaluatedIds.join(',')})`);
        }
      }
    }
    query
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)
      .then(({ data, count }) => {
        if (cancelled) return;
        setApplications(data || []);
        setTotal(count || 0);
        setAppsLoading(false);
      })
      .catch(() => { if (!cancelled) setAppsLoading(false); });
    return () => { cancelled = true; };
  }, [user, isStaff, isJuror, isAdmin, cycle, activeTour, shownEdition, evaluationsOpen, refreshKey, page, debouncedQ, payFilter, evalFilter, evaluatedIds]);

  // Which applications are fully reviewed in the active tour (all jurors finished).
  useEffect(() => {
    if (!isAdmin || !supabase) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('application_reviews')
        .select('application_id, reviewer_id')
        .eq('tour', activeTour)
        .eq('status', 'finished');
      if (cancelled) return;
      const byApp = {};
      (data || []).forEach((r) => { (byApp[r.application_id] ||= new Set()).add(r.reviewer_id); });
      const jc = jurors.length;
      setEvaluatedIds(Object.entries(byApp).filter(([, s]) => jc > 0 && s.size >= jc).map(([id]) => id));
    })();
    return () => { cancelled = true; };
  }, [isAdmin, activeTour, jurors.length, refreshKey]);

  // Debounce the search box.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(searchQ.trim()), 300);
    return () => clearTimeout(id);
  }, [searchQ]);

  // Artists: is the open call accepting applications right now?
  useEffect(() => {
    if (isStaff) return;
    let cancelled = false;
    submissionsOpen().then((open) => { if (!cancelled) setSubsOpen(!!open); });
    return () => { cancelled = true; };
  }, [isStaff, refreshKey]);

  // Reset to the first page when the filter context changes.
  useEffect(() => {
    setPage(0);
  }, [isJuror, isAdmin, activeTour, shownEdition, evaluationsOpen, refreshKey, debouncedQ, payFilter, evalFilter]);

  // Staff: load the cycle (submissions + active tour).
  useEffect(() => {
    if (!isStaff || !supabase) return;
    getCycle().then(setCycle);
  }, [isStaff, refreshKey]);

  // Admin: derive each past edition's year (earliest application) for labels.
  useEffect(() => {
    if (!isAdmin || !supabase || currentEdition <= 1) return;
    let cancelled = false;
    (async () => {
      const map = {};
      for (let ed = 1; ed <= currentEdition; ed++) {
        const { data } = await supabase
          .from('applications').select('created_at')
          .eq('edition', ed).order('created_at', { ascending: true }).limit(1);
        if (data && data[0]) map[ed] = new Date(data[0].created_at).getFullYear();
      }
      if (!cancelled) setEditionYears(map);
    })();
    return () => { cancelled = true; };
  }, [isAdmin, currentEdition]);

  // Admin: is the current edition finished (winners chosen)?
  useEffect(() => {
    if (!isAdmin || !supabase) return;
    let cancelled = false;
    supabase
      .from('applications')
      .select('id', { count: 'exact', head: true })
      .eq('edition', currentEdition)
      .eq('standing', 'winner')
      .then(({ count }) => { if (!cancelled) setCycleFinished((count || 0) > 0); });
    return () => { cancelled = true; };
  }, [isAdmin, currentEdition, refreshKey]);

  // Load which jurors have reviewed each visible application in the active tour.
  useEffect(() => {
    if (!isStaff || !supabase || applications.length === 0) return;
    let cancelled = false;
    supabase
      .from('application_reviews')
      .select('id, application_id, reviewer_id, reviewer_email, status, unlocked, scores, tour')
      .eq('tour', shownTour)
      .in('application_id', applications.map((a) => a.id))
      .then(({ data }) => {
        if (cancelled) return;
        const map = {};
        (data || []).forEach((r) => {
          (map[r.application_id] ||= []).push(r);
        });
        setReviewsByApp(map);
      });
    return () => {
      cancelled = true;
    };
  }, [applications, isStaff, shownTour]);

  // Artist: load their own published tour results.
  useEffect(() => {
    if (isStaff || !user || !supabase) return;
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/.netlify/functions/my-results', {
        headers: { Authorization: `Bearer ${session?.access_token || ''}` },
      });
      const d = await res.json().catch(() => ({}));
      if (!cancelled && Array.isArray(d.results)) {
        const map = {};
        d.results.forEach((r) => { map[r.application_id] = r.tours; });
        setMyResults(map);
        if (d.currentEdition) setArtistEdition(d.currentEdition);
      }
    })();
    return () => { cancelled = true; };
  }, [isStaff, user, refreshKey]);

  // Admin: fetch every juror so we can show review status per juror per app.
  useEffect(() => {
    if (!isAdmin || !supabase) return;
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/.netlify/functions/list-jurors', {
        headers: { Authorization: `Bearer ${session?.access_token || ''}` },
      });
      const d = await res.json().catch(() => ({}));
      if (!cancelled && Array.isArray(d.jurors)) setJurors(d.jurors);
    })();
    return () => { cancelled = true; };
  }, [isAdmin]);

  // Admin reopens a specific juror's finished evaluation for editing.
  const handleUnlock = async (review) => {
    try {
      await unlockReview(review.id);
      setReviewsByApp((prev) => ({
        ...prev,
        [review.application_id]: (prev[review.application_id] || []).map((r) =>
          r.id === review.id ? { ...r, unlocked: true, status: 'draft' } : r
        ),
      }));
    } catch {
      /* no-op; RLS or network */
    }
  };

  const inviteJury = async (e) => {
    e.preventDefault();
    setInviteMsg(null);
    const email = inviteEmail.trim();
    const name = inviteName.trim();
    if (!email) return;
    setInviting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/.netlify/functions/invite-jury', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ email, name }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.status === 'invited') {
        setInviteMsg({ type: 'ok', text: 'Приглашение отправлено.' });
        setInviteEmail('');
        setInviteName('');
        setInviteOpen(false); // collapse the form; the confirmation stays below
      } else if (data.status === 'exists') {
        setInviteMsg({ type: 'exists', text: 'Пользователь с таким email уже существует.' });
      } else {
        setInviteMsg({ type: 'error', text: 'Не удалось отправить приглашение.' });
      }
    } catch {
      setInviteMsg({ type: 'error', text: 'Не удалось отправить приглашение.' });
    } finally {
      setInviting(false);
    }
  };

  // Mint short-lived signed URLs for each application's uploaded work files.
  // Bucket is private; owner/staff SELECT policies let us list + sign here.
  useEffect(() => {
    if (!user || !supabase || applications.length === 0) return;
    let cancelled = false;
    (async () => {
      const map = {};
      for (const app of applications) {
        const folder = `applications/${app.id}`;
        const { data: list } = await supabase.storage.from('works').list(folder);
        if (!list || list.length === 0) continue;
        const paths = list.map((f) => `${folder}/${f.name}`);
        const { data: signed } = await supabase.storage
          .from('works')
          .createSignedUrls(paths, 3600);
        const byNumber = {};
        (signed || []).forEach((s, i) => {
          if (!s?.signedUrl) return;
          const m = /^work(\d+)\./.exec(list[i].name);
          if (m) byNumber[Number(m[1])] = s.signedUrl;
        });
        map[app.id] = byNumber;
      }
      if (!cancelled) setFilesByApp(map);
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [applications, user]);

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

  const jurorName = user?.app_metadata?.name || '';
  const headEyebrow = isAdmin ? 'Администратор' : isJuror ? 'Жюри' : t('account.nav');
  const headTitle = isAdmin ? 'Панель управления' : isJuror ? 'Кабинет жюри' : t('account.cabinetTitle');
  // Unlocking a juror's review is only allowed while the (active) tour is still
  // running - not once it's been finalized (advanced / winners chosen).
  const tour2Exists = applications.some((a) => (a.tour || 1) === 2);
  const hasWinners = applications.some((a) => a.standing === 'winner');
  const tourOngoing = shownTour === activeTour && !(activeTour === 1 ? tour2Exists : hasWinners);

  // Artist: split their own applications into the current edition and the archive.
  const isPast = (app) => !isStaff && !!artistEdition && (app.edition || 1) < artistEdition;
  const currentApps = applications.filter((a) => !isPast(a));
  const pastApps = applications.filter(isPast);
  const orderedApps = [...currentApps, ...pastApps];

  return (
    <main className="apply-page">
      <div className="container">
        <div className="apply-head">
          <span className="eyebrow">- {headEyebrow}</span>
          <h1>{headTitle}</h1>
        </div>
        {isJuror && jurorName ? (
          <div className="identity">
            <span className="identity__name">{jurorName}</span>
            <span className="identity__email">{user.email}</span>
          </div>
        ) : (
          <p style={{ marginBottom: '16px', opacity: 0.7 }}>{user.email}</p>
        )}

        <div className="account-actions">
          <button className="btn-ink" onClick={handleSignOut}>
            {L('signOut', 'Выйти')}
          </button>
          {isAdmin && (
            <Link to="/account/jurors" className="btn-ink">Жюри</Link>
          )}
          {isAdmin && currentEdition > 1 && (
            <button
              type="button"
              className="btn-ink"
              onClick={() => {
                const next = !showArchive;
                setShowArchive(next);
                setViewEdition(next ? currentEdition - 1 : null);
                setArchiveTab('apps');
              }}
            >
              {showArchive ? 'Закрыть архив' : 'Архив биеннале'}
            </button>
          )}
        </div>

        {!isStaff && subsOpen && currentApps.length === 0 && (
          <div className="apply-cta">
            <p className="apply-cta__text">{t('account.applyPrompt')}</p>
            <Link to="/apply" className="btn-gold">{t('nav.apply')}</Link>
          </div>
        )}

        {isAdmin && showArchive && currentEdition > 1 && (
          <div className="edition-switch">
            {Array.from({ length: currentEdition - 1 }, (_, i) => currentEdition - 1 - i).map((ed) => (
              <button
                key={ed}
                type="button"
                className={`tours-tab ${shownEdition === ed ? 'is-active' : ''}`}
                onClick={() => { setViewEdition(ed); setArchiveTab('apps'); }}
              >
                Биеннале {editionYears[ed] || `№${ed}`} (Архив)
              </button>
            ))}
          </div>
        )}

        {isAdmin && isCurrentEdition && <AdminCyclePanel cycle={cycle} canStartNew={cycleFinished} onChanged={() => setRefreshKey((k) => k + 1)} />}
        {isAdmin && isCurrentEdition && (
          <AdminToursPanel
            cycle={cycle}
            applications={applications}
            reviewsByApp={reviewsByApp}
            jurors={jurors}
            viewTour={shownTour}
            setViewTour={setViewTour}
            onChanged={() => setRefreshKey((k) => k + 1)}
          />
        )}
        {isAdmin && !isCurrentEdition && (
          <p className="cycle-note" style={{ margin: '8px 0 0' }}>
            Архив · цикл №{shownEdition} (только просмотр)
          </p>
        )}

        {isJuror && !cycle && <p>…</p>}

        {isJuror && cycle && !evaluationsOpen && (
          <div className="jury-waiting">
            <h2 className="panel-title">Оценка ещё не началась</h2>
            <p>Как только организаторы откроют приём оценок, заявки появятся здесь.</p>
          </div>
        )}

        {archiveMode && (
          <div className="tours-tabs" style={{ marginTop: '20px' }}>
            <button type="button" className={`tours-tab ${archiveTab === 'apps' ? 'is-active' : ''}`} onClick={() => setArchiveTab('apps')}>Все заявки</button>
            <button type="button" className={`tours-tab ${archiveTab === 1 ? 'is-active' : ''}`} onClick={() => setArchiveTab(1)}>Тур 1</button>
            <button type="button" className={`tours-tab ${archiveTab === 2 ? 'is-active' : ''}`} onClick={() => setArchiveTab(2)}>Тур 2</button>
          </div>
        )}

        {archiveMode && archiveTab !== 'apps' && (
          <EditionTourResults edition={shownEdition} tour={archiveTab} />
        )}

        {(!isJuror || (cycle && evaluationsOpen)) && (!archiveMode || archiveTab === 'apps') && (
        <>
        <h2 style={{ margin: '40px 0 24px' }}>
          {isStaff ? 'Все заявки' : (pastApps.length ? t('account.currentApplication') : t('account.yourApplications'))}
        </h2>

        {isAdmin && (
          <div className="app-filters">
            <input
              className="app-filters__search"
              type="search"
              placeholder="Поиск по имени или email"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
            />
            {isCurrentEdition && (
              <div className="app-filters__tags">
                {[
                  { label: 'Оплаченные', group: 'pay', val: 'paid', tone: 'paid' },
                  { label: 'Не оплаченные', group: 'pay', val: 'pending', tone: 'pending' },
                  { label: 'Рассмотренные', group: 'eval', val: 'reviewed', tone: 'reviewed' },
                  { label: 'Не рассмотренные', group: 'eval', val: 'in_review', tone: 'unreviewed' },
                ].map((tag) => {
                  const active = tag.group === 'pay' ? payFilter === tag.val : evalFilter === tag.val;
                  const toggle = () => {
                    const set = tag.group === 'pay' ? setPayFilter : setEvalFilter;
                    set(active ? 'all' : tag.val);
                  };
                  return (
                    <button
                      key={tag.label}
                      type="button"
                      className={`filter-tag filter-tag--${tag.tone} ${active ? 'is-active' : ''}`}
                      onClick={toggle}
                    >
                      {tag.label}
                      {active && <span className="filter-tag__x">✕</span>}
                    </button>
                  );
                })}
              </div>
            )}
            {(searchQ || payFilter !== 'all' || evalFilter !== 'all') && (
              <button
                type="button"
                className="app-filters__clear"
                onClick={() => { setSearchQ(''); setPayFilter('all'); setEvalFilter('all'); }}
              >
                Сбросить
              </button>
            )}
          </div>
        )}

        {appsLoading && <p>…</p>}

        {!appsLoading && applications.length === 0 && (
          <p>{L('noApplications', 'Заявок пока нет.')}</p>
        )}

        {!appsLoading && orderedApps.map((app, idx) => {
          const reviewers = reviewsByApp[app.id] || [];
          const myReview = reviewers.find((r) => r.reviewer_id === user.id) || null;
          const jurorState = !myReview
            ? 'none'
            : myReview.status === 'finished' && !myReview.unlocked
            ? 'finished'
            : 'draft';
          // Jurors who reviewed float to the top (finished, then draft, then none).
          const rankOf = (jid) => {
            const r = reviewers.find((x) => x.reviewer_id === jid);
            return !r ? 0 : r.status === 'finished' && !r.unlocked ? 2 : 1;
          };
          const sortedJurors = [...jurors].sort((a, b) => rankOf(b.id) - rankOf(a.id));

          // Admin sees a compact, clickable row → the full application page.
          if (isAdmin) {
            const thumb = filesByApp[app.id]?.[1];
            const finished = reviewers.filter((r) => r.status === 'finished').length;
            return (
              <Link key={app.id} to={`/account/application/${app.id}`} className="app-row">
                <span className="app-row__thumb">
                  {thumb ? <img src={thumb} alt="" loading="lazy" /> : <span className="app-row__thumb--empty" />}
                </span>
                <span className="app-row__main">
                  <span className="app-row__name">
                    {[app.first_name, app.last_name].filter(Boolean).join(' ') || '—'}
                  </span>
                  <span className="app-row__email">{app.email}</span>
                </span>
                {isCurrentEdition && (
                  <span className={`account-app-card__status account-app-card__status--${app.payment_status}`}>
                    {app.payment_status === 'paid' ? 'Оплачено' : 'Ожидает оплаты'}
                  </span>
                )}
                {isCurrentEdition && (
                  <span className={`review-chip review-chip--${jurors.length > 0 && finished >= jurors.length ? 'finished' : 'none'}`}>
                    {jurors.length > 0 && finished >= jurors.length ? 'Рассмотрено' : 'Не рассмотрено'}
                  </span>
                )}
                {isCurrentEdition && <span className="app-row__jury">Жюри: {finished}/{jurors.length}</span>}
              </Link>
            );
          }

          return (
          <Fragment key={app.id}>
          {idx === currentApps.length && pastApps.length > 0 && (
            <h2 style={{ margin: '48px 0 8px' }}>{t('account.archiveHeading')}</h2>
          )}
          {isPast(app) && (
            <span className="account-section-label" style={{ marginBottom: '8px' }}>
              {t('account.archivedBiennale', { year: new Date(app.created_at).getFullYear() })}
            </span>
          )}
          <div className="account-app-card">
            <div className="account-app-card__meta">
              <span className="account-app-card__ref">{app.payment_ref || app.id}</span>
              {/* Jurors never see payment status. */}
              {!isJuror && (
                <span className={`account-app-card__status account-app-card__status--${app.payment_status}`}>
                  {app.payment_status === 'paid' ? L('statusPaid', 'Оплачено') : L('statusPending', 'Ожидает оплаты')}
                </span>
              )}
              {isJuror && (
                <span className={`account-app-card__status account-app-card__status--juror-${jurorState}`}>
                  {jurorState === 'finished' ? 'Завершено' : jurorState === 'draft' ? 'Черновик' : 'Не оценено'}
                </span>
              )}
            </div>
            {isStaff && (
              <div className="account-app-card__applicant">
                <span className="account-section-label">Художник</span>
                <span className="account-applicant__name">
                  {[app.first_name, app.last_name].filter(Boolean).join(' ') || '—'}
                </span>
                {app.email && <span className="account-applicant__email">{app.email}</span>}
              </div>
            )}
            {app.works && app.works.length > 0 && (
              <>
              {isStaff && <span className="account-section-label">Работы</span>}
              <ul className="account-app-card__works">
                {app.works.map((w, i) => {
                  const url = filesByApp[app.id]?.[i + 1];
                  return (
                    <li key={i} className="account-work">
                      {url ? (
                        <a href={url} target="_blank" rel="noreferrer" className="account-work__thumb">
                          <img src={url} alt={w.title || ''} loading="lazy" />
                        </a>
                      ) : (
                        <span className="account-work__thumb account-work__thumb--empty" aria-hidden="true" />
                      )}
                      <span className="account-work__meta">
                        {w.title || `-`}{w.year ? `, ${w.year}` : ''}{w.media ? ` · ${w.media}` : ''}
                      </span>
                    </li>
                  );
                })}
              </ul>
              </>
            )}
            {!isStaff && myResults[app.id]?.length > 0 && (() => {
              const tours = myResults[app.id];
              const sel = artistTab[app.id] ?? tours[tours.length - 1].tour;
              const tr = tours.find((x) => x.tour === sel) || tours[0];
              return (
                <div className="artist-results">
                  {tours.length > 1 && (
                    <div className="tours-tabs">
                      {tours.map((x) => (
                        <button
                          key={x.tour}
                          type="button"
                          className={`tours-tab ${tr.tour === x.tour ? 'is-active' : ''}`}
                          onClick={() => setArtistTab((p) => ({ ...p, [app.id]: x.tour }))}
                        >
                          {t('account.roundN', { n: x.tour })}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="artist-result">
                    <span className="account-section-label" style={{ marginTop: 0 }}>
                      {tr.tour === 1 ? t('account.tour1Results') : t('account.tour2Results')}
                    </span>
                    {(() => {
                      const kind = tr.outcome === 'advanced' ? 'ok' : tr.outcome === 'winner' ? 'win' : 'neutral';
                      const icon = tr.outcome === 'advanced' ? '✓' : tr.outcome === 'winner' ? medal(tr.place) : '·';
                      const text = tr.outcome === 'advanced'
                        ? t('account.outcomeAdvanced')
                        : tr.outcome === 'winner'
                        ? t('account.placeN', { n: tr.place })
                        : t('account.outcomeEliminated');
                      return (
                        <div className={`artist-outcome artist-outcome--${kind}`}>
                          <span className="artist-outcome__icon">{icon}</span>
                          <span className="artist-outcome__text">{text}</span>
                        </div>
                      );
                    })()}
                    {tr.feedback.length > 0 && (
                      <div className="artist-result__fb">
                        <span className="account-section-label">{t('account.juryFeedback')}</span>
                        {tr.feedback.map((f, i) => (
                          <div className="artist-result__crit" key={i}>
                            <strong>{f.title}{f.avg != null ? `: ${f.avg} / 10` : ''}</strong>
                            {f.comments.map((c, j) => <p key={j}>{c}</p>)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
            {isAdmin && app.payment_status === 'paid' && (
              <>
              <span className="account-section-label">Жюри</span>
              <div className="account-app-card__reviews">
                {sortedJurors.length === 0 && (
                  <span className="account-app-card__not-reviewed">Нет приглашённых жюри</span>
                )}
                {sortedJurors.map((j) => {
                  const r = reviewers.find((x) => x.reviewer_id === j.id) || null;
                  const state = !r
                    ? 'none'
                    : r.status === 'finished' && !r.unlocked
                    ? 'finished'
                    : 'draft';
                  return (
                    <div key={j.id} className="review-row">
                      <span className="review-row__email">
                        {j.name ? (
                          <>
                            <span className="review-row__name">{j.name}</span>
                            <span className="review-row__sub">{j.email}</span>
                          </>
                        ) : (
                          <span className="review-row__name">{j.email}</span>
                        )}
                      </span>
                      <span className={`review-chip review-chip--${state}`}>
                        {state === 'finished' ? 'Рассмотрено' : state === 'draft' ? 'Черновик' : 'Не рассмотрено'}
                      </span>
                      {r && r.status === 'finished' && !r.unlocked && tourOngoing && (
                        <div className="review-row__actions">
                          <button
                            type="button"
                            className="review-row__btn review-row__btn--ghost"
                            onClick={() => handleUnlock(r)}
                          >
                            Разрешить редактирование
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="account-app-card__result-links">
                <Link to={`/account/results/${app.id}/1`} className="btn-ink account-app-card__action">
                  Оценки жюри · тур 1
                </Link>
                {(app.tour || 1) >= 2 && (
                  <Link to={`/account/results/${app.id}/2`} className="btn-ink account-app-card__action">
                    Оценки жюри · тур 2
                  </Link>
                )}
              </div>
              </>
            )}
            {isJuror && (
              <Link to={`/account/review/${app.id}`} className="btn-ink account-app-card__action">
                {jurorState === 'none'
                  ? 'Начать рассмотрение'
                  : jurorState === 'draft'
                  ? 'Продолжить рассмотрение'
                  : 'Просмотреть оценку'}
              </Link>
            )}
          </div>
          </Fragment>
          );
        })}

        {total > PAGE_SIZE && (
          <div className="pager">
            <button
              type="button"
              className="btn-ink pager__btn"
              disabled={page === 0 || appsLoading}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              ← Назад
            </button>
            <span className="pager__info">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} из {total}
            </span>
            <button
              type="button"
              className="btn-ink pager__btn"
              disabled={(page + 1) * PAGE_SIZE >= total || appsLoading}
              onClick={() => setPage((p) => p + 1)}
            >
              Вперёд →
            </button>
          </div>
        )}
        </>
        )}
      </div>
    </main>
  );
}
