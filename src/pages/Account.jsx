import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { isSupabaseConfigured, supabase } from '../lib/supabase.js';
import { signOut } from '../lib/auth.js';
import { unlockReview } from '../lib/reviewsRepo.js';
import AdminCyclePanel from '../components/AdminCyclePanel.jsx';
import AdminToursPanel from '../components/AdminToursPanel.jsx';
import { getCycle } from '../lib/cycleRepo.js';

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
  // app.id → { <workNumber>: signedUrl } for the uploaded work files.
  const [filesByApp, setFilesByApp] = useState({});
  // app.id → [{ reviewer_id, reviewer_email, status, ... }] (review rows).
  const [reviewsByApp, setReviewsByApp] = useState({});
  // All jurors in the system [{ id, email }] (admin only).
  const [jurors, setJurors] = useState([]);
  // Artist's own published results: app.id → [{ tour, outcome, feedback }].
  const [myResults, setMyResults] = useState({});
  // Which tour tab the artist is viewing, per application.
  const [artistTab, setArtistTab] = useState({});
  // Cycle (submissions + tours); active tour is derived from it. Single source
  // of truth shared by both admin panels so they never go out of sync.
  const [cycle, setCycle] = useState(null);
  const activeTour = cycle?.active_tour || 1;
  // Jurors can only see/evaluate once the active tour's evaluations are open.
  const evaluationsOpen = activeTour === 1 ? !!cycle?.tour1_open : !!cycle?.tour2_open;
  // Admin can switch which tour's results they're viewing; defaults to active.
  const [viewTour, setViewTour] = useState(null);
  const shownTour = viewTour ?? activeTour;
  // Bumped after any change to refetch cycle/applications/reviews.
  const [refreshKey, setRefreshKey] = useState(0);

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
    // Jurors get nothing until their tour's evaluations are open.
    if (isJuror && !evaluationsOpen) {
      setApplications([]);
      setAppsLoading(false);
      return;
    }
    setAppsLoading(true);
    // Staff read every application; regular users only their own.
    // RLS enforces this server-side too - the filter is just intent.
    let query = supabase.from('applications').select('*').order('created_at', { ascending: false });
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
    query
      .then(({ data }) => {
        setApplications(data || []);
        setAppsLoading(false);
      })
      .catch(() => setAppsLoading(false));
  }, [user, isStaff, isJuror, isAdmin, activeTour, evaluationsOpen, refreshKey]);

  // Staff: load the cycle (submissions + active tour).
  useEffect(() => {
    if (!isStaff || !supabase) return;
    getCycle().then(setCycle);
  }, [isStaff, refreshKey]);

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
  const identityLine = isJuror && jurorName ? `${jurorName} <${user.email}>` : user.email;

  return (
    <main className="apply-page">
      <div className="container">
        <div className="apply-head">
          <span className="eyebrow">- {headEyebrow}</span>
          <h1>{headTitle}</h1>
        </div>
        <p style={{ marginBottom: '16px', opacity: 0.7 }}>{identityLine}</p>

        <div className="account-actions">
          <button className="btn-ink" onClick={handleSignOut}>
            {L('signOut', 'Выйти')}
          </button>
          {isAdmin && (
            <button
              className="btn-ink"
              onClick={() => {
                setInviteMsg(null);
                setInviteOpen((o) => !o);
              }}
            >
              Пригласить жюри
            </button>
          )}
        </div>

        {isAdmin && inviteOpen && (
          <form className="invite-jury" onSubmit={inviteJury}>
            <input
              type="text"
              placeholder="Имя жюри"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              autoComplete="off"
            />
            <input
              type="email"
              placeholder="email@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              autoComplete="off"
            />
            <button type="submit" className="btn-gold" disabled={inviting}>
              {inviting ? '…' : 'Пригласить'}
            </button>
            {(inviteMsg?.type === 'exists' || inviteMsg?.type === 'error') && (
              <p className={`invite-jury__msg invite-jury__msg--${inviteMsg.type}`}>{inviteMsg.text}</p>
            )}
          </form>
        )}
        {isAdmin && inviteMsg?.type === 'ok' && (
          <p className="invite-jury__msg invite-jury__msg--ok" style={{ marginTop: '12px' }}>
            {inviteMsg.text}
          </p>
        )}

        {isAdmin && <AdminCyclePanel cycle={cycle} onChanged={() => setRefreshKey((k) => k + 1)} />}
        {isAdmin && (
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

        {isJuror && !cycle && <p>…</p>}

        {isJuror && cycle && !evaluationsOpen && (
          <div className="jury-waiting">
            <h2 className="panel-title">Оценивание ещё не открыто</h2>
            <p>Как только организаторы откроют приём оценок, заявки появятся здесь.</p>
          </div>
        )}

        {(!isJuror || (cycle && evaluationsOpen)) && (
        <>
        <h2 style={{ margin: '40px 0 24px' }}>
          {isStaff ? 'Все заявки' : t('account.yourApplications')}
        </h2>

        {appsLoading && <p>…</p>}

        {!appsLoading && applications.length === 0 && (
          <p>{L('noApplications', 'Заявок пока нет.')}</p>
        )}

        {!appsLoading && applications.map((app) => {
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
          return (
          <div key={app.id} className="account-app-card">
            <div className="account-app-card__meta">
              <span className="account-app-card__ref">{app.payment_ref || app.id}</span>
              {/* Jurors never see payment status. */}
              {!isJuror && (
                <span className={`account-app-card__status account-app-card__status--${app.payment_status}`}>
                  {app.payment_status === 'paid' ? L('statusPaid', 'Оплачено') : L('statusPending', 'Ожидает оплаты')}
                </span>
              )}
              {!isStaff && app.payment_status === 'paid' && (
                <span className={`account-app-card__status account-app-card__status--review-${app.review_status === 'reviewed' ? 'reviewed' : 'in_review'}`}>
                  {app.review_status === 'reviewed' ? t('account.statusReviewed') : t('account.statusInReview')}
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
                          {x.tour === 1 ? t('account.tour1Results') : t('account.tour2Results')}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="artist-result">
                    <div className="artist-result__head">
                      <span className="account-section-label" style={{ margin: 0 }}>
                        {tr.tour === 1 ? t('account.tour1Results') : t('account.tour2Results')}
                      </span>
                      <span className={`account-app-card__status account-app-card__status--review-${tr.outcome === 'eliminated' ? 'in_review' : 'reviewed'}`}>
                        {tr.outcome === 'advanced'
                          ? t('account.outcomeAdvanced')
                          : tr.outcome === 'winner'
                          ? t('account.outcomeWinner')
                          : t('account.outcomeEliminated')}
                      </span>
                    </div>
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
              <span className="account-section-label">Жюри · тур {shownTour}</span>
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
                      {r && (
                        <div className="review-row__actions">
                          <Link to={`/account/review/${app.id}/${j.id}/${shownTour}`} className="review-row__btn">
                            Открыть оценку
                          </Link>
                          {r.status === 'finished' && !r.unlocked && (
                            <button
                              type="button"
                              className="review-row__btn review-row__btn--ghost"
                              onClick={() => handleUnlock(r)}
                            >
                              Разрешить редактирование
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
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
          );
        })}
        </>
        )}
      </div>
    </main>
  );
}
