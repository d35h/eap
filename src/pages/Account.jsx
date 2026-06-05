import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { isSupabaseConfigured, supabase } from '../lib/supabase.js';
import { signOut } from '../lib/auth.js';
import { unlockReview } from '../lib/reviewsRepo.js';

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

  // Invite jury (admin only).
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState(null); // { type, text }

  useEffect(() => {
    if (!loading && !user && isSupabaseConfigured()) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user || !supabase) return;
    setAppsLoading(true);
    // Staff read every application; regular users only their own.
    // RLS enforces this server-side too - the filter is just intent.
    let query = supabase.from('applications').select('*').order('created_at', { ascending: false });
    // Admin: all. Juror: only paid (they never see payment status at all).
    // Artist: only their own.
    if (isJuror) query = query.eq('payment_status', 'paid');
    else if (!isAdmin) query = query.eq('user_id', user.id);
    query
      .then(({ data }) => {
        setApplications(data || []);
        setAppsLoading(false);
      })
      .catch(() => setAppsLoading(false));
  }, [user, isStaff]);

  // Load which jurors have reviewed each visible application (staff only).
  useEffect(() => {
    if (!isStaff || !supabase || applications.length === 0) return;
    let cancelled = false;
    supabase
      .from('application_reviews')
      .select('id, application_id, reviewer_id, reviewer_email, status, unlocked, scores')
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
  }, [applications, isStaff]);

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
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.status === 'invited') {
        setInviteMsg({ type: 'ok', text: 'Приглашение отправлено.' });
        setInviteEmail('');
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

  const headTitle = isAdmin ? 'Администратор' : isJuror ? 'Жюри' : t('account.cabinetTitle');

  return (
    <main className="apply-page">
      <div className="container">
        <div className="apply-head">
          <span className="eyebrow">- {headTitle}</span>
          <h1>{headTitle}</h1>
        </div>
        <p style={{ marginBottom: '16px', opacity: 0.7 }}>{user.email}</p>

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
                {[app.first_name, app.last_name].filter(Boolean).join(' ')}
                {app.email ? ` · ${app.email}` : ''}
              </div>
            )}
            {app.works && app.works.length > 0 && (
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
            )}
            {isAdmin && app.payment_status === 'paid' && (
              <div className="account-app-card__reviews">
                {jurors.length === 0 && (
                  <span className="account-app-card__not-reviewed">Нет приглашённых жюри</span>
                )}
                {jurors.map((j) => {
                  const r = reviewers.find((x) => x.reviewer_id === j.id) || null;
                  const state = !r
                    ? 'none'
                    : r.status === 'finished' && !r.unlocked
                    ? 'finished'
                    : 'draft';
                  return (
                    <div key={j.id} className="review-row">
                      <div className="review-row__head">
                        {r ? (
                          <Link to={`/account/review/${app.id}/${j.id}`} className="review-row__email review-row__link">
                            {j.email}
                          </Link>
                        ) : (
                          <span className="review-row__email">{j.email}</span>
                        )}
                        <span className={`review-row__status review-row__status--${state}`}>
                          {state === 'finished' ? 'Рассмотрено' : state === 'draft' ? 'Черновик' : 'Не рассмотрено'}
                        </span>
                        {r && r.status === 'finished' && !r.unlocked && (
                          <button type="button" className="review-row__unlock" onClick={() => handleUnlock(r)}>
                            Разрешить редактирование
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
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
      </div>
    </main>
  );
}
