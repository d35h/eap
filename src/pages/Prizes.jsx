import { Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation.jsx';
import { useSubmissionsOpen } from '../lib/useSubmissionsOpen.js';

// The three main prizes carry the same award text, so it is written once and
// only the place and the sum change.
const PLACES = [1, 2, 3];

export default function Prizes() {
  const { t } = useTranslation();
  const submOpen = useSubmissionsOpen();
  const items = t('prizes.hundredItems');

  return (
    <div className="prizes-page">
      <div className="container">
        <span className="eyebrow">{t('prizes.eyebrow')}</span>
        <h1>
          {t('prizes.titlePart1')}
          <em>{t('prizes.titleEm')}</em>
        </h1>

        <section className="prize-block">
          <h2 className="prize-block__head">{t('prizes.mainHead')}</h2>
          {/* No separate 01/02/03 numeral: "1 место:" already says it. */}
          <ol className="prize-list">
            {PLACES.map((n) => (
              <li className="prize" key={n}>
                <h3 className="prize__title">
                  <span className="prize__place">{t(`prizes.place${n}`)}</span>
                  <span className="prize__sum">{t(`prizes.amount${n}`)}</span>
                </h3>
                <p>{t('prizes.commonAward')}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="prize-block prize-block--special">
          <h2 className="prize-block__head">{t('prizes.specialHead')}</h2>
          <div className="prize-special">
            <h3 className="prize-special__name">{t('prizes.specialName')}</h3>
            <div className="prize-special__body">
              <p>{t('prizes.specialP1')}</p>
              <p>{t('prizes.specialP2')}</p>
            </div>
          </div>
        </section>

        <section className="prize-block prize-hundred">
          <div className="prize-hundred__num" aria-hidden="true">{t('prizes.hundredNum')}</div>
          <div className="prize-hundred__body">
            <h2 className="prize-block__head">{t('prizes.hundredHead')}</h2>
            <p>{t('prizes.hundredP1')}</p>
            <p className="prize-hundred__lead">{t('prizes.hundredLead')}</p>
            {Array.isArray(items) && (
              <ul>
                {items.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            )}
            <p className="prize-hundred__note">{t('prizes.hundredNote')}</p>
          </div>
        </section>

        {submOpen && (
          <div className="prizes-cta">
            <Link to="/apply" className="btn-gold btn-gold-large">
              <span>{t('nav.apply')}</span>
              <svg className="btn-gold__arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
