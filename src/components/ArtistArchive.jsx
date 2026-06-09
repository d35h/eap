import { useState } from 'react';
import { useTranslation } from '../hooks/useTranslation.jsx';
import { imgThumb } from '../lib/img.js';
import SmartImg from './SmartImg.jsx';

const medal = (p) => (p === 1 ? '🥇' : p === 2 ? '🥈' : p === 3 ? '🥉' : '🏆');

// Compact accordion of an artist's past applications: one collapsed row each
// (year + works + final outcome); expand for works + both tours' feedback.
export default function ArtistArchive({ apps, myResults, filesByApp }) {
  const { t } = useTranslation();
  const [openId, setOpenId] = useState(null);
  const [tab, setTab] = useState({});

  const finalOutcome = (tours) => {
    if (!tours || !tours.length) return { kind: 'neutral', label: '—' };
    const win = tours.find((x) => x.outcome === 'winner');
    if (win) return { kind: 'win', label: `${medal(win.place)} ${t('account.placeN', { n: win.place })}` };
    if (tours.some((x) => x.outcome === 'advanced')) return { kind: 'ok', label: t('account.outcomeAdvanced') };
    return { kind: 'neutral', label: t('account.outcomeEliminated') };
  };

  return (
    <div className="art-archive">
      <h2 className="art-archive__heading">{t('account.archiveHeading')}</h2>
      {apps.map((app) => {
        const tours = myResults[app.id] || [];
        const fo = finalOutcome(tours);
        const open = openId === app.id;
        const year = new Date(app.created_at).getFullYear();
        const titles = (app.works || []).map((w) => (w.title || '').trim()).filter(Boolean).slice(0, 3).join(', ') || '—';
        const sel = tab[app.id] ?? (tours.length ? tours[tours.length - 1].tour : 1);
        const tr = tours.find((x) => x.tour === sel) || tours[0];
        return (
          <div key={app.id} className={`art-arch ${open ? 'is-open' : ''}`}>
            <button type="button" className="art-arch__row" onClick={() => setOpenId(open ? null : app.id)}>
              <span className="art-arch__edition">{t('account.archivedBiennale', { year })}</span>
              <span className="art-arch__titles">{titles}</span>
              <span className={`art-arch__badge art-arch__badge--${fo.kind}`}>{fo.label}</span>
              <span className="art-arch__chev" aria-hidden="true">{open ? '▾' : '▸'}</span>
            </button>

            {open && (
              <div className="art-arch__body">
                {app.works?.length > 0 && (
                  <div className="art-arch__works">
                    {app.works.map((w, i) => {
                      const url = filesByApp[app.id]?.[i + 1];
                      return url ? <SmartImg key={i} src={imgThumb(url, 320)} alt={w.title || ''} /> : null;
                    })}
                  </div>
                )}

                {tours.length === 0 ? (
                  <p className="cycle-note">Результаты не опубликованы.</p>
                ) : (
                  <>
                    {tours.length > 1 && (
                      <div className="tours-tabs">
                        {tours.map((x) => (
                          <button
                            key={x.tour}
                            type="button"
                            className={`tours-tab ${tr?.tour === x.tour ? 'is-active' : ''}`}
                            onClick={() => setTab((p) => ({ ...p, [app.id]: x.tour }))}
                          >
                            {t('account.roundN', { n: x.tour })}
                          </button>
                        ))}
                      </div>
                    )}
                    {tr && (
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
                        {(() => {
                          const scored = tr.feedback.filter((f) => f.avg != null);
                          if (!scored.length) return null;
                          const overall = scored.reduce((s, f) => s + f.avg, 0) / scored.length;
                          return (
                            <div className="artist-score">
                              <span className="artist-score__label">{t('account.juryAvg')}</span>
                              <span className="artist-score__value">{overall.toFixed(1)}<em>/10</em></span>
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
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
