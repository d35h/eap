import { useState } from 'react';
import { Link } from 'react-router-dom';
import Countdown from '../components/Countdown.jsx';
import { useTranslation } from '../hooks/useTranslation.jsx';
import { useSubmissionsOpen } from '../lib/useSubmissionsOpen.js';

// ── Временный состав жюри (hardcoded). Имена и фото постоянны;
//    роль и био берутся из переводов (team.jury, по индексу). ──
const JURY = [
  { name: 'Marina Abramović', photo: '/jury/abramovic.jpg' },
  { name: 'Ai Weiwei', photo: '/jury/aiweiwei.jpg' },
  { name: 'Anish Kapoor', photo: '/jury/kapoor.jpg' },
];

export default function Landing() {
  const { t } = useTranslation();
  // The four steps are long; behind a disclosure the section stays scannable.
  const [stepsOpen, setStepsOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const submOpen = useSubmissionsOpen(); // undefined = loading, then true/false

  return (
    <main>
      {/* HERO - type carries the screen, everything else is a footnote to it */}
      <section className="ed-hero" id="opencall">
        {/* Colour and grain are the hero's, so the page below stays white */}
        <div className="wash" aria-hidden="true">
          <span /><span /><span /><span /><span />
        </div>
        <div className="grain" aria-hidden="true" />

        {/* The name is the way back to the top of the site. */}
        <h1 className="ed-title">
          {/* Already on "/", so the router would do nothing - scroll explicitly. */}
          <a
            href="/"
            aria-label="Eurasia Art Platform"
            onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          >
            <span>Eurasia Art</span>
            <span>Platform</span>
          </a>
        </h1>

        <div className="ed-hero__foot">
          <p className="ed-micro">{t('hero.vpStrong')}</p>
          {submOpen === undefined ? (
            <div className="hero-loading" aria-hidden="true" />
          ) : submOpen ? (
            <>
              <Link to="/apply" className="ed-cta">{t('nav.apply')}</Link>
            </>
          ) : (
            <>
              <p className="ed-micro">{t('opencall.closedTitle')}</p>
              <p className="ed-micro ed-micro--faint">{t('opencall.closedNote')}</p>
            </>
          )}
        </div>
      </section>

      {/* INDEX - the reference's stacked list of oversized titles */}
      {/* FAQ - the heading is the control, as in the reference's list */}
      <section className="ed-panel" id="faq">
        <button
          type="button"
          className={`ed-row ed-row--toggle${faqOpen ? ' is-open' : ''}`}
          aria-expanded={faqOpen}
          aria-controls="faq-list"
          onClick={() => setFaqOpen((v) => !v)}
        >
          <span className="ed-row__title">{t('faq.title')}</span>
        </button>
        <div id="faq-list" className="faq-list" hidden={!faqOpen}>
          <p className="section-intro">{t('faq.lead')}</p>
          {(Array.isArray(t('faq.items')) ? t('faq.items') : []).map((qa, i) => (
            <div className="faq-row" key={i}>
              <h3>{qa.q}</h3>
              <p>{qa.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PROCESS */}
      <section className="ed-panel" id="process">
        <button
          type="button"
          className={`ed-row ed-row--toggle${stepsOpen ? ' is-open' : ''}`}
          aria-expanded={stepsOpen}
          aria-controls="process-steps"
          onClick={() => setStepsOpen((v) => !v)}
        >
          <span className="ed-row__title">
            {[t('process.titlePart1'), t('process.titleEm'), t('process.titlePart2')].join('')}
          </span>
        </button>

        <div id="process-steps" className="process-steps" hidden={!stepsOpen}>
          <p className="section-intro">{t('process.intro')}</p>
            {[1, 2, 3, 4].map((n) => (
              <div className="step" key={n}>
                <div className="step-num">0{n}</div>
                <h3>{t(`process.step${n}Title`)}</h3>
                <p>{t(`process.step${n}Desc`)}</p>
                <div className="meta">{t(`process.step${n}Meta`)}</div>
              </div>
            ))}
        </div>
      </section>

      {/* MANIFEST */}
      <section className="block manifest">
        <div className="container">
          <div className="manifest-text">
            <span className="eyebrow">{t('manifest.eyebrow')}</span>
            <h2>
              {t('manifest.titlePart1')}
              <em>{t('manifest.titleEm')}</em>
            </h2>
            <p>
              {t('manifest.p1Start')}<em>{t('manifest.p1Em')}</em>{t('manifest.p1Rest')}
            </p>
            <p>{t('manifest.p2')}</p>
            <p>{t('manifest.p3')}</p>
          </div>
          <div className="manifest-facts">
            {[1, 2, 3].map((n) => {
              // A fact can be text-only; an empty .num would still reserve its line.
              const num = t(`manifest.fact${n}Num`);
              return (
                <div className="fact" key={n}>
                  {num ? <div className="num">{num}</div> : null}
                  <div className="desc">{t(`manifest.fact${n}Desc`)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* TEAM / JURY */}
      <section className="block" id="team">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">{t('team.eyebrow')}</span>
            <h2>
              {t('team.titlePart1')}
              <em>{t('team.titleEm')}</em>
            </h2>
            <p className="section-intro">{t('team.intro')}</p>
          </div>

          <div className="jury-grid">
            {JURY.map((j, i) => {
              const meta = (Array.isArray(t('team.jury')) ? t('team.jury') : [])[i] || {};
              return (
                <div className="jury-member" key={j.name}>
                  <div className="jury-photo">
                    <img src={j.photo} alt={j.name} loading="lazy" />
                  </div>
                  <div className="role">{meta.role}</div>
                  <h4>{j.name}</h4>
                  <p className="bio">{meta.bio}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <ContactBlock />
    </main>
  );
}

// ── Contact form with state + validation + simulated submit ──
function ContactBlock() {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: '', email: '', phone: '', subject: '', message: '',
  });
  const [status, setStatus] = useState(null); // null | 'sending' | 'success' | 'error'
  const [errors, setErrors] = useState({});

  const update = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: null }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = t('apply.required');
    if (!form.email.trim()) newErrors.email = t('apply.required');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = t('apply.invalidEmail');
    if (!form.message.trim()) newErrors.message = t('apply.required');
    return newErrors;
  };

  const submit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length > 0) {
      setErrors(v);
      setStatus('validation');
      return;
    }
    setStatus('sending');

    try {
      const res = await fetch('/.netlify/functions/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        // Never report a delivery we cannot back up - the previous version
        // faked success and every enquiry was silently lost.
        const data = await res.json().catch(() => ({}));
        setStatus(data.code === 'no_transport' ? 'unavailable' : 'error');
        return;
      }
      setStatus('success');
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  return (
    <section className="contact-block" id="contact">
      <div className="container">
        <span className="eyebrow">{t('contact.eyebrow')}</span>
        <p className="lead">{t('contact.lead')}</p>

        <div className="contact-grid">
          <form className="contact-form" onSubmit={submit} noValidate>
            <div className="field-group">
              <label>{t('contact.name')} <span className="req">*</span></label>
              <input
                type="text"
                placeholder={t('contact.namePh')}
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                className={errors.name ? 'error' : ''}
              />
              <span className="field-error">{errors.name}</span>
            </div>

            <div className="field-group">
              <label>{t('contact.email')} <span className="req">*</span></label>
              <input
                type="email"
                placeholder={t('contact.emailPh')}
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                className={errors.email ? 'error' : ''}
              />
              <span className="field-error">{errors.email}</span>
            </div>

            <div className="field-group full">
              <label>{t('contact.subject')}</label>
              <input
                type="text"
                placeholder={t('contact.subjectPh')}
                value={form.subject}
                onChange={(e) => update('subject', e.target.value)}
              />
            </div>

            <div className="field-group full">
              <label>{t('contact.message')} <span className="req">*</span></label>
              <textarea
                placeholder={t('contact.messagePh')}
                value={form.message}
                onChange={(e) => update('message', e.target.value)}
                className={errors.message ? 'error' : ''}
              />
              <span className="field-error">{errors.message}</span>
            </div>

            <div className="full">
              <button className="btn-ink" type="submit" disabled={status === 'sending'}>
                {status === 'sending' ? t('contact.sending') : t('contact.send')}
              </button>

              {status === 'success' && (
                <div className="form-status success">{t('contact.successMsg')}</div>
              )}
              {(status === 'error' || status === 'unavailable') && (
                <div className="form-status error">{t('contact.errorMsg')}</div>
              )}
              {status === 'validation' && (
                <div className="form-status error">{t('contact.validationMsg')}</div>
              )}
            </div>
          </form>

          <aside className="contact-aside">
            <div className="item">
              <div className="label">{t('contact.emailLabel')}</div>
              <div className="value"><a href="mailto:info@eap.art">info@eap.art</a></div>
            </div>
            <div className="item">
              <div className="label">{t('contact.opencallLabel')}</div>
              <div className="value"><a href="mailto:opencall@eap.art">opencall@eap.art</a></div>
            </div>
            <div className="item">
              <div className="label">{t('contact.partnersLabel')}</div>
              <div className="value"><a href="mailto:partners@eap.art">partners@eap.art</a></div>
            </div>
            <div className="item">
              <div className="label">{t('contact.socialLabel')}</div>
              <div className="social-row">
                <a href="https://www.instagram.com/eurasia_art_platform/" target="_blank" rel="noreferrer">Instagram</a>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
