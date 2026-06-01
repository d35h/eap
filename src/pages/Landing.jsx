import { useState } from 'react';
import { Link } from 'react-router-dom';
import Countdown from '../components/Countdown.jsx';
import { useTranslation } from '../hooks/useTranslation.jsx';

export default function Landing() {
  const { t } = useTranslation();

  return (
    <main>
      {/* HERO */}
      <section className="hero">
        <div className="container">
          <div className="hero-meta">
            <span>— {t('hero.meta1')}</span>
            <span>{t('hero.meta2')}</span>
          </div>
          <h1>EAP — <em>Eurasian</em> Art Platform</h1>
          <p className="hero-vp">
            {t('hero.vpStart')}
            <strong>{t('hero.vpStrong')}</strong>
            {t('hero.vpRest')}
          </p>
          <p className="hero-sub">{t('hero.sub')}</p>
          <div className="hero-bottom">
            <div className="hero-founders">
              <div className="label">{t('hero.foundedBy')}</div>
              {t('team.member1Name')}
              <span style={{ color: 'hsla(36,22%,92%,0.3)', margin: '0 12px' }}>·</span>
              {t('team.member2Name')}
            </div>
            <div>
              <Link to="/process" className="btn-ghost">{t('nav.process')}</Link>
            </div>
          </div>
        </div>
      </section>

      {/* OPEN CALL */}
      <section className="block is-darker" id="opencall">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">{t('opencall.eyebrow')}</span>
            <h2>
              {t('opencall.titlePart1')}
              <em>{t('opencall.titleEm')}</em>
              {t('opencall.titlePart2')}
            </h2>
            <p className="section-intro">{t('opencall.intro')}</p>
          </div>

          <div className="deadline-row">
            <span className="label">{t('opencall.deadlineLabel')}</span>
            <span>{t('opencall.deadlineValue')}</span>
          </div>

          <Countdown />

          <div style={{ display: 'flex', gap: '24px', alignItems: 'center', marginTop: '32px', flexWrap: 'wrap' }}>
            <Link to="/apply" className="btn-gold btn-gold-large">{t('nav.apply')}</Link>
            <span style={{ fontSize: '0.85rem', color: 'var(--fg-muted)' }}>{t('opencall.opening')}</span>
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

      {/* PARTICIPANTS */}
      <section className="block" id="participants">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">{t('participants.eyebrow')}</span>
            <h2>
              {t('participants.titlePart1')}
              <em>{t('participants.titleEm')}</em>
              {t('participants.titlePart2')}
            </h2>
            <p className="section-intro">{t('participants.intro')}</p>
          </div>
          <div className="participants-grid">
            {[1, 2, 3, 4].map((n) => (
              <div className="participant-card" key={n}>
                <div className="pcontent">
                  <div className="pname">{t('participants.soonName')}</div>
                  <div className="pmeta">{t('participants.soonMeta')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TEAM */}
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
          <div className="team-grid">
            {[1, 2, 3].map((n) => (
              <div className="team-member" key={n}>
                <div className="role">{t(`team.role${n}`)}</div>
                <h4>{t(`team.member${n}Name`)}</h4>
                <p className="bio">{t(`team.member${n}Bio`)}</p>
              </div>
            ))}
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
        <h2>
          {t('contact.titlePart1')}
          <em>{t('contact.titleEm')}</em>
          {t('contact.titlePart2')}
        </h2>
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
              <label>{t('contact.phone')}</label>
              <input
                type="tel"
                placeholder={t('contact.phonePh')}
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
              />
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
                <a href="#" target="_blank" rel="noopener">Instagram</a>
                <a href="#" target="_blank" rel="noopener">Telegram</a>
                <a href="#" target="_blank" rel="noopener">LinkedIn</a>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
