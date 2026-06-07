import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { REVIEW_CRITERIA } from '../lib/reviewCriteria.js';

const reviewTotal = (s) => REVIEW_CRITERIA.reduce((a, c) => a + (Number(s?.[c.key]?.rating) || 0), 0);
const medal = (p) => (p === 1 ? '🥇' : p === 2 ? '🥈' : p === 3 ? '🥉' : '🏆');
const applicant = (a) => [a.first_name, a.last_name].filter(Boolean).join(' ') || a.email || a.id.slice(0, 8);

// Read-only ranked results for one edition + tour (all paid applications, not
// paginated). Each row links to the detailed juror evaluations.
export default function EditionTourResults({ edition, tour }) {
  const [apps, setApps] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    setReady(false);
    (async () => {
      const { data: a } = await supabase
        .from('applications').select('*').eq('edition', edition).eq('payment_status', 'paid');
      const ids = (a || []).map((x) => x.id);
      let rv = [];
      if (ids.length) {
        const { data } = await supabase
          .from('application_reviews').select('application_id, scores, status')
          .eq('tour', tour).in('application_id', ids);
        rv = data || [];
      }
      if (cancelled) return;
      setApps(a || []);
      setReviews(rv);
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, [edition, tour]);

  const byApp = {};
  reviews.filter((r) => r.status === 'finished').forEach((r) => {
    (byApp[r.application_id] ||= []).push(r);
  });
  const scoreOf = (id) => {
    const f = byApp[id] || [];
    return f.length ? f.reduce((s, r) => s + reviewTotal(r.scores), 0) / f.length : null;
  };

  const participants = apps.filter((a) => (tour === 1 ? true : (a.tour || 1) >= 2));
  const ranked = [...participants].sort((a, b) => (scoreOf(b.id) ?? -1) - (scoreOf(a.id) ?? -1));
  const winners = participants
    .filter((a) => a.standing === 'winner')
    .sort((a, b) => (scoreOf(b.id) ?? -1) - (scoreOf(a.id) ?? -1));
  const placeOf = new Map(winners.map((a, i) => [a.id, i + 1]));

  const outcome = (a) => {
    if (tour === 1) {
      if ((a.tour || 1) >= 2) return { label: 'Прошёл', cls: 'finished' };
      if (a.standing === 'eliminated') return { label: 'Выбыл', cls: 'none' };
      return { label: '—', cls: 'draft' };
    }
    if (a.standing === 'winner') { const p = placeOf.get(a.id); return { label: `${medal(p)} #${p}`, cls: 'finished' }; }
    if (a.standing === 'eliminated') return { label: 'Выбыл', cls: 'none' };
    return { label: '—', cls: 'draft' };
  };

  if (!ready) return <p>…</p>;
  if (ranked.length === 0) return <p className="cycle-note">Нет заявок</p>;

  return (
    <div className="tours-results">
      {ranked.map((a, i) => {
        const sc = scoreOf(a.id);
        const o = outcome(a);
        return (
          <Link key={a.id} to={`/account/application/${a.id}`} className="tours-result">
            <span className="tours-result__rank">{i + 1}</span>
            <span className="tours-result__name">
              <span className="tours-result__title">{applicant(a)}</span>
              {a.email && <span className="tours-result__sub">{a.email}</span>}
            </span>
            <span className="tours-result__score">{sc == null ? '—' : sc.toFixed(1)}</span>
            <span className={`review-chip review-chip--${o.cls}`}>{o.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
