import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { REVIEW_CRITERIA } from '../lib/reviewCriteria.js';

const reviewTotal = (s) => REVIEW_CRITERIA.reduce((a, c) => a + (Number(s?.[c.key]?.rating) || 0), 0);
const medal = (p) => (p === 1 ? '🥇' : p === 2 ? '🥈' : p === 3 ? '🥉' : '🏆');
const applicant = (a) => [a.first_name, a.last_name].filter(Boolean).join(' ') || a.email || a.id.slice(0, 8);

// Retrospective header for an archived edition: stats + winners podium.
export default function EditionSummary({ edition, year }) {
  const [apps, setApps] = useState([]);
  const [scores, setScores] = useState({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    setReady(false);
    (async () => {
      const { data: a } = await supabase
        .from('applications').select('*').eq('edition', edition).eq('payment_status', 'paid');
      const ids = (a || []).map((x) => x.id);
      const map = {};
      if (ids.length) {
        const { data: rv } = await supabase
          .from('application_reviews').select('application_id, scores, status')
          .eq('tour', 2).in('application_id', ids);
        const byApp = {};
        (rv || []).filter((r) => r.status === 'finished').forEach((r) => {
          (byApp[r.application_id] ||= []).push(reviewTotal(r.scores));
        });
        Object.entries(byApp).forEach(([id, arr]) => { map[id] = arr.reduce((s, x) => s + x, 0) / arr.length; });
      }
      if (cancelled) return;
      setApps(a || []);
      setScores(map);
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, [edition]);

  if (!ready) return null;
  const total = apps.length;
  const advanced = apps.filter((a) => (a.tour || 1) >= 2).length;
  const winners = apps
    .filter((a) => a.standing === 'winner')
    .sort((x, y) => (scores[y.id] ?? -1) - (scores[x.id] ?? -1));
  const plural = (n, one, few, many) => {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  };

  return (
    <div className="edition-summary">
      <div className="edition-summary__head">
        <h2 className="edition-summary__title">Биеннале {year || `№${edition}`}</h2>
        <div className="edition-summary__stats">
          <span><strong>{total}</strong> {plural(total, 'заявка', 'заявки', 'заявок')}</span>
          <span><strong>{advanced}</strong> во втором туре</span>
          <span><strong>{winners.length}</strong> {plural(winners.length, 'победитель', 'победителя', 'победителей')}</span>
        </div>
      </div>

      {winners.length > 0 && (
        <div className="podium">
          {winners.map((a, i) => (
            <Link key={a.id} to={`/account/application/${a.id}`} className={`podium__item podium__item--${i + 1}`}>
              <span className="podium__medal" aria-hidden="true">{medal(i + 1)}</span>
              <span className="podium__name">{applicant(a)}</span>
              {scores[a.id] != null && (
                <span className="podium__score">{scores[a.id].toFixed(1)} балл{plural(Math.round(scores[a.id]), '', 'а', 'ов')}</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
