import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { isSupabaseConfigured, supabase } from '../lib/supabase.js';
import { signOut } from '../lib/auth.js';

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
    if (!isStaff) query = query.eq('user_id', user.id);
    query
      .then(({ data }) => {
        setApplications(data || []);
        setAppsLoading(false);
      })
      .catch(() => setAppsLoading(false));
  }, [user, isStaff]);

  const markReviewed = async (id) => {
    if (!supabase) return;
    const { error } = await supabase
      .from('applications')
      .update({ review_status: 'reviewed' })
      .eq('id', id);
    if (!error) {
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, review_status: 'reviewed' } : a))
      );
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

        {!appsLoading && applications.map((app) => (
          <div key={app.id} className="account-app-card">
            <div className="account-app-card__meta">
              <span className="account-app-card__ref">{app.payment_ref || app.id}</span>
              <span className={`account-app-card__status account-app-card__status--${app.payment_status}`}>
                {app.payment_status === 'paid' ? L('statusPaid', 'Оплачено') : L('statusPending', 'Ожидает оплаты')}
              </span>
              {app.payment_status === 'paid' && (
                <span className={`account-app-card__status account-app-card__status--review-${app.review_status === 'reviewed' ? 'reviewed' : 'in_review'}`}>
                  {app.review_status === 'reviewed' ? L('statusReviewed', 'Рассмотрено') : L('statusInReview', 'На рассмотрении')}
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
            {isStaff && app.payment_status === 'paid' && app.review_status !== 'reviewed' && (
              <button
                type="button"
                className="btn-ink account-app-card__action"
                onClick={() => markReviewed(app.id)}
              >
                Отметить рассмотренной
              </button>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
