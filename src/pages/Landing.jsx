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
  const submOpen = useSubmissionsOpen(); // undefined = loading, then true/false

  return (
    <main>
      {/* HERO */}
      <section className="hero" id="opencall">
        <div className="container">
          <div className="hero-meta">
            <span>- {t('hero.meta1')}</span>
          </div>
          <div className="hero-grid">
            <div className="hero-left">
              <h1 className="hero-title">
                <span className="hero-title__acronym">EAP</span>
                <span className="hero-title__full"><em>Eurasian</em> Art Platform</span>
              </h1>
              <p className="hero-vp">
                {t('hero.vpStart')}
                <strong>{t('hero.vpStrong')}</strong>
                {t('hero.vpRest')}
              </p>
              <p className="hero-sub">{t('hero.sub')}</p>
            </div>
            <aside className="hero-right">
              {submOpen === undefined ? (
                <div className="hero-loading" aria-hidden="true" />
              ) : submOpen ? (
                <>
                  <Countdown />
                  <span className="hero-opening">{t('opencall.opening')}</span>
                </>
              ) : (
                <div className="hero-closed">
                  <span className="hero-closed__title">{t('opencall.closedTitle')}</span>
                  <p className="hero-closed__note">{t('opencall.closedNote')}</p>
                </div>
              )}
            </aside>
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section className="block" id="process">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">{t('process.eyebrow')}</span>
            <h2>
              {t('process.titlePart1')}
              <em>{t('process.titleEm')}</em>
              {t('process.titlePart2')}
            </h2>
            <p className="section-intro">{t('process.intro')}</p>
          </div>

          <div className="process-steps">
            {[1, 2, 3, 4].map((n) => (
              <div className="step" key={n}>
                <div className="step-num">0{n}</div>
                <h3>{t(`process.step${n}Title`)}</h3>
                <p>{t(`process.step${n}Desc`)}</p>
                <div className="meta">{t(`process.step${n}Meta`)}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '40px' }}>
            <Link to="/process" className="btn-ghost">{t('processPage.titlePart1')}{t('processPage.titleEm')}{t('processPage.titlePart2')}</Link>
          </div>
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
          </div>
          <div className="manifest-facts">
            {[1, 2, 3].map((n) => (
              <div className="fact" key={n}>
                <div className="num">{t(`manifest.fact${n}Num`)}</div>
                <div className="desc">{t(`manifest.fact${n}Desc`)}</div>
              </div>
            ))}
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

          <div className="jury-criteria">
            <h3 className="subsection-title">{t('team.criteriaLabel')}</h3>
            <div className="criteria-list">
              {(Array.isArray(t('team.criteria')) ? t('team.criteria') : []).map((c, i) => (
                <div className="criterion" key={i}>
                  <h4>{c.title}</h4>
                  <p>{c.desc}</p>
                </div>
              ))}
            </div>
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

    // ───────────────────────────────────────────────────────────
    //  Здесь надо подключить реальную отправку.
    //  Примеры: fetch('/api/contact'), Resend, EmailJS, Formspree.
    //  Сейчас симулируем задержку и успех.
    // ───────────────────────────────────────────────────────────
    try {
      await new Promise((res) => setTimeout(res, 900));
      // throw new Error('demo error'); // расскомментировать для теста ошибки
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

            <div className="field-group">
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
              {status === 'error' && (
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
                <a href="https://www.instagram.com/eurasian_art_platform/" target="_blank" rel="noreferrer">Instagram</a>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
