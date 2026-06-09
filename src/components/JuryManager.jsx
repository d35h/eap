import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { supabase } from '../lib/supabase.js';

// Self-contained juror roster + invite. Rendered inline in the cabinet (toggle)
// and on the /account/jurors route. The parent gates admin access and the back link.
export default function JuryManager() {
  const { user } = useAuth();
  const isAdmin = user?.app_metadata?.role === 'admin';

  const [jurors, setJurors] = useState([]);
  const [ready, setReady] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (!isAdmin || !supabase) return;
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/.netlify/functions/list-jurors', {
        headers: { Authorization: `Bearer ${session?.access_token || ''}` },
      });
      const d = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (Array.isArray(d.jurors)) setJurors(d.jurors);
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, [isAdmin, refresh]);

  if (!isAdmin) return null;

  const authed = async (path, body) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
      body: JSON.stringify(body),
    });
    return res.json().catch(() => ({}));
  };

  const invite = async (e) => {
    e.preventDefault();
    setMsg(null);
    if (!email.trim()) return;
    setBusy(true);
    try {
      const d = await authed('/.netlify/functions/invite-jury', { email: email.trim(), name: name.trim() });
      if (d.status === 'invited') {
        setMsg({ type: 'ok', text: 'Приглашение отправлено.' });
        setName(''); setEmail(''); setRefresh((r) => r + 1);
      } else if (d.status === 'exists') {
        setMsg({ type: 'err', text: 'Пользователь с таким email уже существует.' });
      } else {
        setMsg({ type: 'err', text: 'Не удалось отправить приглашение.' });
      }
    } finally { setBusy(false); }
  };

  const activate = async (j) => {
    setMsg(null);
    setBusy(true);
    try {
      await authed('/.netlify/functions/manage-juror', { action: 'activate', email: j.email });
      setMsg({ type: 'ok', text: `Письмо для входа отправлено: ${j.email}` });
    } finally { setBusy(false); }
  };

  const remove = async (j) => {
    if (!window.confirm(`Удалить жюри ${j.name || j.email}? Их оценки сохранятся.`)) return;
    setMsg(null);
    setBusy(true);
    try {
      await authed('/.netlify/functions/manage-juror', { action: 'delete', jurorId: j.id });
      setRefresh((r) => r + 1);
    } finally { setBusy(false); }
  };

  return (
    <>
      <div className="apply-head">
        <span className="eyebrow">Администратор</span>
        <h1>Состав жюри{ready && jurors.length > 0 && <span className="head-count">{jurors.length}</span>}</h1>
      </div>

      {!ready ? (
        <div className="jurors-list" aria-busy="true">
          {[0, 1, 2].map((i) => <div key={i} className="juror-card juror-card--skeleton" />)}
        </div>
      ) : jurors.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state__title">В жюри пока никого нет</p>
          <p className="empty-state__sub">Пригласите первого члена жюри ниже — он получит письмо со ссылкой для входа.</p>
        </div>
      ) : (
        <div className="jurors-list">
          {jurors.map((j) => (
            <div key={j.id} className="juror-card">
              <span className="juror-card__id">
                <span className="juror-card__name">{j.name || j.email}</span>
                {j.name && <span className="juror-card__email">{j.email}</span>}
              </span>
              <div className="juror-card__actions">
                <button
                  type="button"
                  className="review-row__btn review-row__btn--ghost"
                  disabled={busy}
                  title="Отправит письмо со ссылкой для установки пароля"
                  onClick={() => activate(j)}
                >
                  Сбросить пароль
                </button>
                <button type="button" className="review-row__btn review-row__btn--danger" disabled={busy} onClick={() => remove(j)}>
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="invite-card">
        <span className="invite-card__label">Пригласить в жюри</span>
        <form className="invite-jury" onSubmit={invite}>
          <input type="text" placeholder="Имя" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
          <input type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="off" />
          <button type="submit" className="btn-gold" disabled={busy}>{busy ? '…' : 'Пригласить'}</button>
        </form>
        {msg && <p className={`invite-jury__msg invite-jury__msg--${msg.type === 'ok' ? 'ok' : 'error'}`}>{msg.text}</p>}
      </div>
    </>
  );
}
