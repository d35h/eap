import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation.jsx';
import { useFormPersist } from '../hooks/useFormPersist.js';

const INITIAL = {
  firstName: '', lastName: '', email: '', phone: '', country: '', city: '',
  workTitle: '', workYear: '', workMedia: '', workSize: '', workDesc: '', workPrice: '',
  paymentMethod: 'apple',
};

export default function Apply() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [form, setForm, clearForm, justSaved] = useFormPersist('eap-apply-form', INITIAL);
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState([]); // не сохраняется в localStorage — слишком тяжёлые
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const update = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: null }));
  };

  // ── Validation per step ──
  const validateStep = (s) => {
    const e = {};
    if (s === 1) {
      if (!form.firstName.trim()) e.firstName = t('apply.required');
      if (!form.lastName.trim()) e.lastName = t('apply.required');
      if (!form.email.trim()) e.email = t('apply.required');
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = t('apply.invalidEmail');
    }
    if (s === 2) {
      if (!form.workTitle.trim()) e.workTitle = t('apply.required');
      if (!form.workDesc.trim()) e.workDesc = t('apply.required');
    }
    return e;
  };

  const goNext = () => {
    const e = validateStep(step);
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    setErrors({});
    setStep((s) => Math.min(s + 1, 4));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    setErrors({});
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToStep = (s) => {
    if (s > step) return; // нельзя прыгать вперёд через невалидные шаги
    setErrors({});
    setStep(s);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Final submit (simulate payment + send) ──
  const submitFinal = async () => {
    setSubmitting(true);
    try {
      // ───────────────────────────────────────────────────────
      //  Здесь подключается реальная оплата (Stripe Checkout).
      //  Только после успешной оплаты — POST на бэк с данными.
      //  Сейчас симулируем задержку.
      // ───────────────────────────────────────────────────────
      await new Promise((res) => setTimeout(res, 1800));

      // На реальном бэке: создать запись в БД (имя, фамилия, email, телефон, work info, оплата ID)
      console.log('Submitted application:', form, 'Files:', files.map((f) => f.name));

      clearForm();
      setFiles([]);
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      console.error(e);
      setSubmitting(false);
      alert('Payment error. Please try again.');
    }
  };

  if (success) {
    return (
      <div className="apply-page">
        <div className="container">
          <div className="success-screen">
            <div className="ok">{t('apply.successOk')}</div>
            <h2>{t('apply.successTitle')}</h2>
            <p>{t('apply.successDesc')}</p>
            <Link to="/" className="btn-ink">{t('apply.successBack')}</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="apply-page">
      <div className="container">
        <div className="apply-head">
          <span className="eyebrow">{t('apply.eyebrow')}</span>
          <h1>
            {t('apply.titlePart1')}
            <em>{t('apply.titleEm')}</em>
            {t('apply.titlePart2')}
          </h1>
          <p className="lead">{t('apply.lead')}</p>
          <div className={`saved-notice ${justSaved ? 'visible' : ''}`}>
            {t('apply.saved')}
          </div>
        </div>

        <div className="wizard">
          {/* Progress */}
          <div className="wizard-progress">
            {[1, 2, 3, 4].map((n) => {
              const className =
                n === step ? 'active' :
                n < step ? 'done' :
                '';
              return (
                <button
                  key={n}
                  className={`wstep ${className}`}
                  onClick={() => goToStep(n)}
                  type="button"
                >
                  <span className="num">{t('apply.stepOf', { n })}</span>
                  <span className="name">{t(`apply.step${n}`)}</span>
                </button>
              );
            })}
          </div>

          {/* Body */}
          <div className="wizard-body">
            {step === 1 && (
              <Step1 form={form} update={update} errors={errors} t={t} />
            )}
            {step === 2 && (
              <Step2 form={form} update={update} errors={errors} t={t} />
            )}
            {step === 3 && (
              <Step3 files={files} setFiles={setFiles} t={t} />
            )}
            {step === 4 && (
              <Step4 form={form} files={files} update={update} t={t} />
            )}
          </div>

          {/* Nav */}
          <div className="wizard-nav">
            <button
              className="btn-ink-outline"
              onClick={goBack}
              disabled={step === 1 || submitting}
              type="button"
            >
              {t('apply.back')}
            </button>
            <div className="spacer" />
            {step < 4 && (
              <button
                className="btn-ink"
                onClick={goNext}
                type="button"
              >
                {t('apply.next')}
              </button>
            )}
            {step === 4 && (
              <button
                className="btn-ink"
                onClick={submitFinal}
                disabled={submitting}
                type="button"
              >
                {submitting ? t('apply.submitting') : t('apply.submit')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 1: Contacts ───
function Step1({ form, update, errors, t }) {
  return (
    <>
      <div className="info-banner">
        {t('apply.bannerBefore')}
        <Link to="/process">{t('apply.bannerLink')}</Link>
        {t('apply.bannerAfter')}
      </div>
      <span className="wizard-section-label">{t('apply.stepOf', { n: 1 })}</span>
      <h2>{t('apply.contactsTitle')}</h2>
      <div className="wizard-grid">
        <Field label={t('apply.firstName')} required value={form.firstName} ph={t('apply.firstNamePh')}
               error={errors.firstName} onChange={(v) => update('firstName', v)} />
        <Field label={t('apply.lastName')} required value={form.lastName} ph={t('apply.lastNamePh')}
               error={errors.lastName} onChange={(v) => update('lastName', v)} />
        <Field label="Email" required type="email" value={form.email} ph="your@email.com"
               error={errors.email} onChange={(v) => update('email', v)} />
        <Field label={t('contact.phone')} type="tel" value={form.phone} ph={t('contact.phonePh')}
               onChange={(v) => update('phone', v)} />
        <Field label={t('apply.country')} value={form.country} ph={t('apply.countryPh')}
               onChange={(v) => update('country', v)} />
        <Field label={t('apply.city')} value={form.city} ph={t('apply.cityPh')}
               onChange={(v) => update('city', v)} />
      </div>
    </>
  );
}

// ─── Step 2: Work info ───
function Step2({ form, update, errors, t }) {
  return (
    <>
      <span className="wizard-section-label">{t('apply.stepOf', { n: 2 })}</span>
      <h2>{t('apply.workTitle')}</h2>
      <div className="wizard-grid">
        <Field label={t('apply.workTitleField')} required value={form.workTitle} ph={t('apply.workTitlePh')}
               error={errors.workTitle} onChange={(v) => update('workTitle', v)} />
        <Field label={t('apply.workYear')} value={form.workYear} ph={t('apply.workYearPh')}
               onChange={(v) => update('workYear', v)} />
        <Field label={t('apply.workMedia')} value={form.workMedia} ph={t('apply.workMediaPh')}
               onChange={(v) => update('workMedia', v)} />
        <Field label={t('apply.workSize')} value={form.workSize} ph={t('apply.workSizePh')}
               onChange={(v) => update('workSize', v)} />
        <Field label={t('apply.workDesc')} required textarea value={form.workDesc} ph={t('apply.workDescPh')}
               error={errors.workDesc} onChange={(v) => update('workDesc', v)} full />
        <Field label={t('apply.workPrice')} value={form.workPrice} ph={t('apply.workPricePh')}
               help={t('apply.workPriceHelp')} onChange={(v) => update('workPrice', v)} full />
      </div>
    </>
  );
}

// ─── Step 3: Files ───
function Step3({ files, setFiles, t }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const onFiles = (newFiles) => {
    const list = Array.from(newFiles);
    const valid = list.filter((f) => f.size <= 25 * 1024 * 1024);
    if (valid.length !== list.length) {
      alert('Некоторые файлы больше 25 MB и были пропущены.');
    }
    setFiles((prev) => [...prev, ...valid].slice(0, 10));
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    onFiles(e.dataTransfer.files);
  };

  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const fmtSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  return (
    <>
      <span className="wizard-section-label">{t('apply.stepOf', { n: 3 })}</span>
      <h2>{t('apply.filesTitle')}</h2>
      <div className="info-banner" style={{ marginBottom: '20px' }}>
        {t('apply.filesNote')}
      </div>

      <div
        className={`dropzone ${dragOver ? 'dragover' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') inputRef.current?.click(); }}
      >
        <div className="icon">↑</div>
        <p><strong>{t('apply.dropzoneTitle')}</strong></p>
        <p>{t('apply.dropzoneSub')}</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          accept="image/jpeg,image/png,application/pdf,video/mp4"
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <div className="file-list">
          {files.map((f, i) => (
            <div className="file-item" key={i}>
              <span className="name">{f.name}</span>
              <span className="size">{fmtSize(f.size)}</span>
              <button type="button" onClick={() => removeFile(i)} aria-label="Remove">×</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ─── Step 4: Review + Payment ───
function Step4({ form, files, update, t }) {
  const methods = [
    { id: 'apple', name: t('apply.payApple'), desc: t('apply.payAppleDesc') },
    { id: 'card', name: t('apply.payCard'), desc: t('apply.payCardDesc') },
    { id: 'google', name: t('apply.payGoogle'), desc: t('apply.payGoogleDesc') },
    { id: 'bank', name: t('apply.payBank'), desc: t('apply.payBankDesc') },
  ];

  const empty = (val) => (val && val.trim()) ? val : t('apply.emptyField');
  const valClass = (val) => (val && val.trim()) ? 'val' : 'val empty';

  return (
    <>
      <span className="wizard-section-label">{t('apply.stepOf', { n: 4 })}</span>
      <h2>{t('apply.paymentTitle')}</h2>

      {/* Review */}
      <div className="review-section">
        <h4>{t('apply.reviewContact')}</h4>
        <div className="review-row"><span className="key">{t('apply.firstName')}</span><span className={valClass(form.firstName)}>{empty(form.firstName)}</span></div>
        <div className="review-row"><span className="key">{t('apply.lastName')}</span><span className={valClass(form.lastName)}>{empty(form.lastName)}</span></div>
        <div className="review-row"><span className="key">Email</span><span className={valClass(form.email)}>{empty(form.email)}</span></div>
        <div className="review-row"><span className="key">{t('contact.phone')}</span><span className={valClass(form.phone)}>{empty(form.phone)}</span></div>
        <div className="review-row"><span className="key">{t('apply.country')} / {t('apply.city')}</span><span className={valClass((form.country || '') + (form.city ? ', ' + form.city : ''))}>{empty((form.country || '') + (form.city ? ', ' + form.city : ''))}</span></div>
      </div>

      <div className="review-section">
        <h4>{t('apply.reviewWork')}</h4>
        <div className="review-row"><span className="key">{t('apply.workTitleField')}</span><span className={valClass(form.workTitle)}>{empty(form.workTitle)}</span></div>
        <div className="review-row"><span className="key">{t('apply.workYear')}</span><span className={valClass(form.workYear)}>{empty(form.workYear)}</span></div>
        <div className="review-row"><span className="key">{t('apply.workMedia')}</span><span className={valClass(form.workMedia)}>{empty(form.workMedia)}</span></div>
        <div className="review-row"><span className="key">{t('apply.workSize')}</span><span className={valClass(form.workSize)}>{empty(form.workSize)}</span></div>
        <div className="review-row"><span className="key">{t('apply.workDesc')}</span><span className={valClass(form.workDesc)}>{empty(form.workDesc)}</span></div>
        <div className="review-row"><span className="key">{t('apply.workPrice')}</span><span className={valClass(form.workPrice)}>{empty(form.workPrice)}</span></div>
      </div>

      <div className="review-section">
        <h4>{t('apply.reviewFiles')}</h4>
        <div className="review-row">
          <span className="key">{t('apply.reviewFiles')}</span>
          <span className={files.length > 0 ? 'val' : 'val empty'}>
            {files.length > 0 ? t('apply.filesCount', { n: files.length }) : t('apply.noFiles')}
          </span>
        </div>
      </div>

      {/* Payment method */}
      <div style={{ marginTop: '40px' }}>
        <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginBottom: '8px', color: 'var(--ink)' }}>
          {t('apply.paymentMethod')}
        </h4>
        <div className="review-row" style={{ paddingTop: '8px' }}>
          <span className="key">{t('apply.fee')}</span>
          <span className="val" style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem' }}>{t('apply.feeValue')}</span>
        </div>

        <div className="pay-methods">
          {methods.map((m) => (
            <button
              key={m.id}
              className={`pay-method ${form.paymentMethod === m.id ? 'selected' : ''}`}
              onClick={() => update('paymentMethod', m.id)}
              type="button"
            >
              <span className="pm-name">{m.name}</span>
              <span className="pm-desc">{m.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Reusable Field ───
function Field({ label, required, value, onChange, ph, error, help, type = 'text', textarea, full }) {
  return (
    <div className={`field-group ${full ? 'full' : ''}`}>
      <label>
        {label} {required && <span className="req">*</span>}
      </label>
      {textarea ? (
        <textarea
          placeholder={ph}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={error ? 'error' : ''}
        />
      ) : (
        <input
          type={type}
          placeholder={ph}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={error ? 'error' : ''}
        />
      )}
      <span className="field-error">{error}</span>
      {help && <span className="field-help">{help}</span>}
    </div>
  );
}
