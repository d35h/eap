import { useState } from 'react';
import { Link } from 'react-router-dom';
import { imgThumb } from '../lib/img.js';

const STATE = {
  none: { label: 'Не оценено', dot: 'none' },
  draft: { label: 'Черновик', dot: 'draft' },
  finished: { label: 'Завершено', dot: 'finished' },
};
const ORDER = { none: 0, draft: 1, finished: 2 };
const plural = (n, one, few, many) => {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
};

// Compact, scannable review queue for jurors. Unreviewed float to the top;
// a progress meter + filter make a long list manageable. No artist identity.
export default function JurorReviewList({ applications, reviewsByApp, userId, filesByApp, tour }) {
  const [filter, setFilter] = useState('all');

  const stateOf = (app) => {
    const r = (reviewsByApp[app.id] || []).find((x) => x.reviewer_id === userId);
    return !r ? 'none' : (r.status === 'finished' && !r.unlocked ? 'finished' : 'draft');
  };
  const rows = applications.map((a) => ({ app: a, st: stateOf(a) }));
  const doneCount = rows.filter((r) => r.st === 'finished').length;
  const filtered = rows.filter((r) => filter === 'all' || r.st === filter);
  const sorted = [...filtered].sort((a, b) => ORDER[a.st] - ORDER[b.st]);

  const filters = [
    { key: 'all', label: 'Все' },
    { key: 'none', label: 'Не оценённые' },
    { key: 'draft', label: 'Черновики' },
    { key: 'finished', label: 'Завершённые' },
  ];

  return (
    <div className="jrl">
      <div className="jrl__head">
        <h2 className="jrl__heading">Оценка · Тур {tour}</h2>
        <span className="jrl__progress">Оценено: <strong>{doneCount}</strong> из {rows.length}</span>
      </div>

      <div className="jrl__filters">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`tours-tab ${filter === f.key ? 'is-active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <p className="cycle-note">Нет заявок в этой категории.</p>
      ) : (
        <div className="jrl__list">
          {sorted.map(({ app, st }) => {
            const works = app.works || [];
            const title = (works[0]?.title || '').trim() || 'Без названия';
            const thumb = filesByApp[app.id]?.[1];
            const s = STATE[st];
            return (
              <Link key={app.id} to={`/account/review/${app.id}`} className="jrl__row">
                <span className="jrl__thumb">
                  {thumb ? <img src={imgThumb(thumb, 96)} alt="" loading="lazy" /> : <span className="jrl__thumb--empty" />}
                </span>
                <span className="jrl__main">
                  <span className="jrl__title">{title}</span>
                  <span className="jrl__meta">{works.length} {plural(works.length, 'работа', 'работы', 'работ')}</span>
                </span>
                <span className={`jrl__status jrl__status--${s.dot}`}>
                  <span className="jrl__dot" aria-hidden="true" />{s.label}
                </span>
                <span className="jrl__arrow" aria-hidden="true">→</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
