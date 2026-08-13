import { Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation.jsx';
import OrganicCta from '../components/OrganicCta.jsx';

export default function Process() {
  const { t } = useTranslation();

  const details = [1, 2, 3, 4].map((n) => ({
    n,
    title: t(`processPage.detail${n}Title`),
    p1: t(`processPage.detail${n}P1`),
    items: t(`processPage.detail${n}Items`),
    extraP: n === 2 ? [t('processPage.detail2P3')] : [],
  }));

  return (
    <div className="process-page">
      <div className="container">
        <span className="eyebrow">{t('nav.process')}</span>
        <h1>
          {t('processPage.titlePart1')}
          <em>{t('processPage.titleEm')}</em>
          {t('processPage.titlePart2')}
        </h1>
        <div className="process-detail-list">
          {details.map((d) => (
            <div className="process-detail-item" key={d.n}>
              <div>
                <div className="num-block">0{d.n}</div>
                <div className="num-meta">{t(`process.step${d.n}Meta`)}</div>
              </div>
              <div>
                <h2>{d.title}</h2>
                <p>{d.p1}</p>
                {d.extraP.map((p, i) => <p key={i}>{p}</p>)}
                {Array.isArray(d.items) && (
                  <ul>
                    {d.items.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="process-cta">
          <h3>{t('processPage.ctaTitle')}</h3>
          <OrganicCta to="/apply">{t('processPage.ctaButton')}</OrganicCta>
        </div>
      </div>
    </div>
  );
}
