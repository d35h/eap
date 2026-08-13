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
        <section className="pz-hero">
          <span className="eyebrow">{t('prizes.eyebrow')}</span>
          <h1>
            {t('prizes.titlePart1')}
            <em>{t('prizes.titleEm')}</em>
          </h1>
        </section>

        <section className="pz-main">
          <span className="pz-eyebrow">{t('prizes.mainHead')}</span>
          <div className="pz-grid">
            {PLACES.map((n) => (
              <article className="pz-prize" key={n}>
                <div className="pz-prize__rank">
                  {`0${n}`}
                  <span>{t(`prizes.place${n}`)}</span>
                </div>
                <div className="pz-prize__sum">{t(`prizes.amount${n}`)}</div>
                <p>{t('prizes.commonAward')}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="pz-special">
          <span className="pz-eyebrow">{t('prizes.specialHead')}</span>
          <div className="pz-special__shell">
            <div>
              <h2 className="pz-special__head">{t('prizes.specialHead')}</h2>
              <div className="pz-special__name">{t('prizes.specialName')}</div>
            </div>
            <div className="pz-special__copy">
              <p>{t('prizes.specialP1')}</p>
              <p>{t('prizes.specialP2')}</p>
            </div>
          </div>
        </section>

        <section className="pz-hundred">
          <div className="pz-hundred__shell">
            <div>
              <div className="pz-hundred__num" aria-hidden="true">{t('prizes.hundredNum')}</div>
              <div className="pz-hundred__caption">{t('prizes.hundredHead')}</div>
            </div>
            <div className="pz-hundred__copy">
              <p>{t('prizes.hundredP1')}</p>
              {Array.isArray(items) && items.map((item, i) => (
                <div className="pz-benefit" key={i}>
                  <div className="pz-benefit__num">{`0${i + 1}`}</div>
                  <div>{item}</div>
                </div>
              ))}
              <p className="pz-hundred__note">{t('prizes.hundredNote')}</p>
              {/* Nobody who applied goes unmentioned: the rest are named in the
                  catalogue's list of participants. */}
              <p className="pz-hundred__rest">{t('prizes.restP1')}</p>
            </div>
          </div>
        </section>

        {submOpen && (
          <section className="pz-cta">
            <Link to="/apply" className="pz-cta__row">
              <span className="pz-cta__title">{t('nav.apply')}</span>
              <span className="pz-cta__arrow" aria-hidden="true">&#8594;</span>
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}
