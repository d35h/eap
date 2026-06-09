import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';

// Admin-only juror management: invite, activate (resend password), delete.
export default function Jurors() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const isAdmin = user?.app_metadata?.role === 'admin';

  const [jurors, setJurors] = useState([]);
  const [refresh, setRefresh] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (loading || !isSupabaseConfigured()) return;
    if (!user) navigate('/login');
    else if (!isAdmin) navigate('/account');
  }, [user, loading, isAdmin, navigate]);

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
  }, [isAdmin, refresh]);

  if (!isSupabaseConfigured() || loading || !user || !isAdmin) return null;

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
    <main className="apply-page account-page">
      <div className="container">
        <Link to="/account" className="review-back">← Назад</Link>
        <div className="apply-head">
          <span className="eyebrow">Администратор</span>
          <h1>Жюри</h1>
        </div>

        <form className="invite-jury" onSubmit={invite}>
          <input type="text" placeholder="Имя жюри" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
          <input type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="off" />
          <button type="submit" className="btn-gold" disabled={busy}>{busy ? '…' : 'Пригласить'}</button>
        </form>
        {msg && <p className={`invite-jury__msg invite-jury__msg--${msg.type === 'ok' ? 'ok' : 'error'}`} style={{ marginTop: '12px' }}>{msg.text}</p>}

        <h2 style={{ margin: '36px 0 16px' }}>Список жюри</h2>
        {jurors.length === 0 && <p>Жюри пока нет.</p>}
        <div className="jurors-list">
          {jurors.map((j) => (
            <div key={j.id} className="review-row">
              <span className="review-row__email">
                <span className="review-row__name">{j.name || j.email}</span>
                {j.name && <span className="review-row__sub">{j.email}</span>}
              </span>
              <div className="review-row__actions">
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
      </div>
    </main>
  );
}
