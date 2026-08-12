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
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [status, setStatus] = useState(null); // null | 'sending' | 'success' | 'error' | 'unavailable'
  const [errors, setErrors] = useState({});
  // Errors are withheld until a field has been left or the form submitted -
  // showing "required" under everything untouched reads as an accusation.
  const [touched, setTouched] = useState({});

  const update = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: null }));
  };

  const validate = (f = form) => {
    const next = {};
    if (!f.name.trim()) next.name = t('apply.required');
    if (!f.email.trim()) next.email = t('apply.required');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) next.email = t('apply.invalidEmail');
    if (!f.message.trim()) next.message = t('apply.required');
    return next;
  };

  const blur = (k) => {
    setTouched((s0) => ({ ...s0, [k]: true }));
    const found = validate();
    setErrors((e) => ({ ...e, [k]: found[k] || null }));
  };

  const shown = (k) => (touched[k] || status === 'validation' ? errors[k] : null);

  const submit = async (e) => {
    e.preventDefault();
    const found = validate();
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setTouched({ name: true, email: true, message: true });
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
        // Never report a delivery we cannot back up.
        const data = await res.json().catch(() => ({}));
        setStatus(data.code === 'no_transport' ? 'unavailable' : 'error');
        return;
      }
      setStatus('success');
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
      setTouched({});
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  const field = (key, { type = 'text', ph, multiline = false } = {}) => {
    const err = shown(key);
    const id = `contact-${key}`;
    const required = key !== 'subject';
    const props = {
      id,
      value: form[key],
      placeholder: ph,
      onChange: (e) => update(key, e.target.value),
      onBlur: () => blur(key),
      'aria-invalid': err ? 'true' : undefined,
      'aria-describedby': err ? `${id}-err` : undefined,
      className: err ? 'error' : '',
    };
    return (
      <div className={`cx-field${multiline ? ' cx-field--wide' : ''}`}>
        <label htmlFor={id}>
          {t(`contact.${key}`)} {required && <span className="req">*</span>}
        </label>
        {multiline ? <textarea rows={5} {...props} /> : <input type={type} {...props} />}
        {err && <span className="cx-error" id={`${id}-err`}>{err}</span>}
      </div>
    );
  };

  const ROWS = [
    { label: t('contact.emailLabel'), value: 'info@eap.art', href: 'mailto:info@eap.art' },
    { label: t('contact.opencallLabel'), value: 'opencall@eap.art', href: 'mailto:opencall@eap.art' },
    { label: t('contact.partnersLabel'), value: 'partners@eap.art', href: 'mailto:partners@eap.art' },
    {
      label: t('contact.socialLabel'),
      value: 'Instagram',
      href: 'https://www.instagram.com/eurasia_art_platform/',
      external: true,
    },
  ];

  return (
    <section className="cx" id="contact">
      <div className="cx__inner">
        <div className="cx__left">
          <span className="cx__eyebrow">{t('contact.eyebrow')}</span>
          <h2 className="cx__title">{t('contact.lead')}</h2>

          <form className="cx__form" onSubmit={submit} noValidate>
            <div className="cx__row">
              {field('name', { ph: t('contact.namePh') })}
              {field('email', { type: 'email', ph: t('contact.emailPh') })}
            </div>
            {field('subject', { ph: t('contact.subjectPh') })}
            {field('message', { ph: t('contact.messagePh'), multiline: true })}

            <button className="cx__send" type="submit" disabled={status === 'sending'}>
              <span>{status === 'sending' ? t('contact.sending') : t('contact.send')}</span>
              <span className="cx__arrow" aria-hidden="true">&#10230;</span>
            </button>

            {status === 'success' && <p className="cx__note">{t('contact.successMsg')}</p>}
            {(status === 'error' || status === 'unavailable') && (
              <p className="cx__note cx__note--bad">{t('contact.errorMsg')}</p>
            )}
          </form>
        </div>

        <aside className="cx__right">
          <ul className="cx__list">
            {ROWS.map((r) => (
              <li key={r.href}>
                <a
                  href={r.href}
                  {...(r.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                >
                  <span className="cx__label">{r.label}</span>
                  <span className="cx__value">{r.value}</span>
                  <span className="cx__arrow" aria-hidden="true">&#10230;</span>
                </a>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}
