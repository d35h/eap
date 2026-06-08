import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';

const applicant = (a) => [a.first_name, a.last_name].filter(Boolean).join(' ') || a.email || a.id.slice(0, 8);

// Admin view of jury coverage for the active tour: per juror, how many of the
// applications they've finished and — expanded — exactly which artists they
// still haven't evaluated (each links to that application). Fetches all active
// applications itself (ids + names + review rows only — no images), so the
// numbers are accurate across the whole tour, not just the current page.
export default function JuryCoverage({ jurors, edition, tour }) {
  const [apps, setApps] = useState([]);
  const [revs, setRevs] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    setReady(false);
    (async () => {
      const { data: a } = await supabase
        .from('applications').select('id, first_name, last_name, email')
        .eq('payment_status', 'paid').eq('edition', edition).eq('standing', 'active')
        .order('created_at', { ascending: true });
      const ids = (a || []).map((x) => x.id);
      let r = [];
      if (ids.length) {
        const { data: rr } = await supabase
          .from('application_reviews').select('application_id, reviewer_id, status')
          .in('application_id', ids).eq('tour', tour);
        r = (rr || []).filter((x) => x.status === 'finished');
      }
      if (cancelled) return;
      setApps(a || []);
      setRevs(r);
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, [edition, tour]);

  if (!ready || jurors.length === 0 || apps.length === 0) return null;

  const rows = jurors.map((j) => {
    const done = new Set(revs.filter((r) => r.reviewer_id === j.id).map((r) => r.application_id));
    const pending = apps.filter((a) => !done.has(a.id));
    return { j, done: apps.length - pending.length, total: apps.length, pending };
  });

  return (
    <div className="jury-progress">
      <span className="account-section-label">Прогресс жюри · Тур {tour}</span>
      {rows.map(({ j, done, total, pending }) => {
        const complete = pending.length === 0;
        const open = openId === j.id;
        return (
          <div key={j.id} className={`jcov ${open ? 'is-open' : ''}`}>
            <button
              type="button"
              className="jcov__row"
              disabled={complete}
              onClick={() => setOpenId(open ? null : j.id)}
            >
              <span className="jcov__name">{j.name || j.email}</span>
              <span className="jury-progress__bar"><span style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></span>
              <span className={`jury-progress__count ${complete ? 'is-done' : ''}`}>{done}/{total}{complete ? ' ✓' : ''}</span>
              <span className="jcov__hint">
                {complete ? '' : <>{open ? '▾' : '▸'} не оценил {pending.length}</>}
              </span>
            </button>
            {open && !complete && (
              <ul className="jcov__pending">
                {pending.map((a) => (
                  <li key={a.id}>
                    <Link to={`/account/application/${a.id}`}>{applicant(a)}</Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
