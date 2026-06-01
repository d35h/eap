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
                <span>{item.q}</span>
                <span className="faq-icon" aria-hidden="true">{open === i ? '−' : '+'}</span>
              </button>
              <div className="faq-a">
                <p>{item.a}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="process-cta">
          <h3>{t('processPage.ctaTitle')}</h3>
          <Link to="/apply" className="btn-gold btn-gold-large">
            {t('processPage.ctaButton')}
          </Link>
        </div>
      </div>
    </div>
  );
}
