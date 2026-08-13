import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation.jsx';
import OrganicCta from '../components/OrganicCta.jsx';

export default function FAQ() {
  const { t } = useTranslation();
  const items = t('faq.items');
  const list = Array.isArray(items) ? items : [];
  const [open, setOpen] = useState(0);

  return (
    <div className="faq-page">
      <div className="container">
        <span className="eyebrow">{t('faq.eyebrow')}</span>
        <h1>{t('faq.title')}</h1>
        <p className="lead">{t('faq.lead')}</p>

        <div className="faq-list">
          {list.map((item, i) => (
            <div className={`faq-item ${open === i ? 'is-open' : ''}`} key={i}>
              <button
                className="faq-q"
                onClick={() => setOpen(open === i ? -1 : i)}
                aria-expanded={open === i}
              >
                <span className="faq-q-text">{item.q}</span>
                <span className="faq-icon" aria-hidden="true" />
              </button>
              <div className="faq-a">
                <div className="faq-a-inner">
                  <p>{item.a}</p>
                </div>
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
