import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation.jsx';

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
          <Link to="/apply" className="btn-gold btn-gold-large">
            <span>{t('processPage.ctaButton')}</span>
            <svg className="btn-gold__arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
