import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation.jsx';
import { useFormPersist } from '../hooks/useFormPersist.js';
import { submitApplication, uploadWorkFiles } from '../lib/applicationsRepo.js';
import { startPayment } from '../lib/payments.js';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { submissionsOpen } from '../lib/cycleRepo.js';

const emptyWork = () => ({ title: '', year: '', media: '', size: '', desc: '' });

const INITIAL = {
  firstName: '', lastName: '', email: '', phone: '', country: '', city: '',
  website: '', instagram: '',
  works: [emptyWork()],
  paymentChannel: 'byn',
};

const fmtSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
};

// Стоимость зависит от числа работ
const PRICE_BY_COUNT = { 1: 100, 2: 150, 3: 170 };
const feeFor = (n) => `${PRICE_BY_COUNT[Math.min(Math.max(n, 1), 3)]} BYN`;

const EUR_BY_COUNT = { 1: 30, 2: 45, 3: 50 };
const eurFor = (n) => `€${EUR_BY_COUNT[Math.min(Math.max(n, 1), 3)]}`;

export default function Apply() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [form, setForm, clearForm, justSaved] = useFormPersist('eap-apply-form-v2', INITIAL);
  const [step, setStep] = useState(1);
  // Файлы не сохраняются в localStorage (File нельзя сериализовать). Параллельно works по индексу.
  const [workFiles, setWorkFiles] = useState(() => form.works.map(() => null));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('status') === 'success') { clearForm(); setSuccess(true); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    submissionsOpen().then((open) => setClosed(!open));
  }, []);

  const update = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: null }));
  };

  // ── Works helpers ──
  const updateWork = (i, k, v) => {
    setForm((f) => ({
      ...f,
      works: f.works.map((w, j) => (j === i ? { ...w, [k]: v } : w)),
    }));
    const errKey = `w${i}${k === 'title' ? 'Title' : k === 'desc' ? 'Desc' : ''}`;
    if (errors[errKey]) setErrors((e) => ({ ...e, [errKey]: null }));
  };

  const addWork = () => {
    setForm((f) => (f.works.length >= 3 ? f : { ...f, works: [...f.works, emptyWork()] }));
    setWorkFiles((wf) => (wf.length >= 3 ? wf : [...wf, null]));
  };

  const removeWork = (i) => {
    setForm((f) => ({ ...f, works: f.works.filter((_, j) => j !== i) }));
    setWorkFiles((wf) => wf.filter((_, j) => j !== i));
  };

  const setWorkFile = (i, file) => {
    setWorkFiles((wf) => wf.map((x, j) => (j === i ? file : x)));
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
      form.works.forEach((w, i) => {
        if (!w.title.trim()) e[`w${i}Title`] = t('apply.required');
        if (!w.desc.trim()) e[`w${i}Desc`] = t('apply.required');
      });
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
    setStep((s) => Math.min(s + 1, 3));
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
      if (isSupabaseConfigured()) {
        const application = await submitApplication({ ...form, tier: form.works.length });
        const paths = await uploadWorkFiles(supabase, application.id, workFiles);
        console.log('Application stored:', application.id, paths);
        const channel = form.paymentChannel === 'intl' ? 'georgia' : 'bepaid';
        const redirectUrl = await startPayment(application.id, channel);
        window.location.assign(redirectUrl);
        return;
      } else {
        await new Promise((res) => setTimeout(res, 1800)); // simulated fallback
        console.log('Submitted (simulated):', form, workFiles.map((f) => f?.name || null));
      }

      clearForm();
      setWorkFiles([null]);
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      console.error(e);
      setSubmitting(false);
      alert('Submission error. Please try again.');
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

  if (closed) {
    return (
      <div className="apply-page">
        <div className="container">
          <div className="success-screen">
            <h2>{t('apply.closedTitle')}</h2>
            <p>{t('apply.closedDesc')}</p>
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
            {[1, 2, 3].map((n) => {
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
              <Step2
                works={form.works}
                workFiles={workFiles}
                updateWork={updateWork}
                addWork={addWork}
                removeWork={removeWork}
                setWorkFile={setWorkFile}
                errors={errors}
                t={t}
              />
            )}
            {step === 3 && (
              <Step4 form={form} workFiles={workFiles} update={update} t={t} />
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
            {step < 3 && (
              <button
                className="btn-ink"
                onClick={goNext}
                type="button"
              >
                {t('apply.next')}
              </button>
            )}
            {step === 3 && (
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
  // Non-blocking heads-up: if this email already has an account, nudge to log in.
  const [emailExists, setEmailExists] = useState(false);
  useEffect(() => {
    const email = (form.email || '').trim();
    if (!supabase || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailExists(false);
      return;
    }
    let cancelled = false;
    const id = setTimeout(async () => {
      const { data, error } = await supabase.rpc('email_has_account', { p_email: email });
      if (!cancelled && !error) setEmailExists(!!data);
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [form.email]);

  return (
    <>
      <div className="info-banner">
        {t('apply.bannerBefore')}
        <Link to="/process">{t('apply.bannerLink')}</Link>
        {t('apply.bannerAfter')}
      </div>
      <span className="wizard-section-label">{t('apply.stepOf', { n: 1 })}</span>
      <h2>{t('apply.contactsTitle')}</h2>
      {emailExists && (
        <p className="apply-email-notice">
          {t('apply.emailExistsBefore')}
          <Link to="/login">{t('apply.emailExistsLink')}</Link>
          {t('apply.emailExistsAfter')}
        </p>
      )}
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
        <Field label={t('apply.website')} type="url" value={form.website} ph={t('apply.websitePh')}
               onChange={(v) => update('website', v)} />
        <Field label={t('apply.instagram')} value={form.instagram} ph={t('apply.instagramPh')}
               onChange={(v) => update('instagram', v)} />
      </div>
    </>
  );
}

// ─── Step 2: Works (each: fields + one file) ───
function Step2({ works, workFiles, updateWork, addWork, removeWork, setWorkFile, errors, t }) {
  return (
    <>
      <span className="wizard-section-label">{t('apply.stepOf', { n: 2 })}</span>
      <h2>{t('apply.workTitle')}</h2>

      {works.map((w, i) => (
        <WorkEntry
          key={i}
          index={i}
          work={w}
          file={workFiles[i]}
          onChange={(k, v) => updateWork(i, k, v)}
          onFile={(f) => setWorkFile(i, f)}
          onRemove={works.length > 1 ? () => removeWork(i) : null}
          errors={errors}
          t={t}
        />
      ))}

      {works.length < 3 ? (
        <button type="button" className="add-work-btn" onClick={addWork}>
          + {t('apply.addWork')} ({works.length} / 3)
        </button>
      ) : (
        <p className="works-full">{t('apply.worksFull')}</p>
      )}

      <div className="price-note">
        <span>{t('apply.pricing')}</span>
        <strong>{feeFor(works.length)}</strong>
      </div>
    </>
  );
}

// ─── A single work: fields + file ───
function WorkEntry({ index, work, file, onChange, onFile, onRemove, errors, t }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (fileList) => {
    const f = fileList && fileList[0];
    if (!f) return;
    if (f.size > 25 * 1024 * 1024) {
      alert('Файл больше 25 MB.');
      return;
    }
    onFile(f);
  };

  return (
    <div className="work-entry">
      <div className="work-entry-head">
        <span className="work-entry-num">{t('apply.workLabel', { n: index + 1 })}</span>
        {onRemove && (
          <button type="button" className="work-remove" onClick={onRemove}>
            {t('apply.removeWork')}
          </button>
        )}
      </div>

      <div className="wizard-grid">
        <Field label={t('apply.workTitleField')} required value={work.title} ph={t('apply.workTitlePh')}
               error={errors[`w${index}Title`]} onChange={(v) => onChange('title', v)} />
        <Field label={t('apply.workYear')} value={work.year} ph={t('apply.workYearPh')}
               onChange={(v) => onChange('year', v)} />
        <Field label={t('apply.workMedia')} value={work.media} ph={t('apply.workMediaPh')}
               onChange={(v) => onChange('media', v)} />
        <Field label={t('apply.workSize')} value={work.size} ph={t('apply.workSizePh')}
               onChange={(v) => onChange('size', v)} />
        <Field label={t('apply.workDesc')} required textarea value={work.desc} ph={t('apply.workDescPh')}
               error={errors[`w${index}Desc`]} onChange={(v) => onChange('desc', v)} full />
      </div>

      <input
        ref={inputRef}
        type="file"
        hidden
        accept="image/jpeg,image/png,application/pdf,video/mp4"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {file ? (
        <div className="file-list">
          <div className="file-item">
            <span className="name">{file.name}</span>
            <span className="size">{fmtSize(file.size)}</span>
            <button type="button" onClick={() => onFile(null)} aria-label="Remove">×</button>
          </div>
        </div>
      ) : (
        <div
          className={`dropzone ${dragOver ? 'dragover' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') inputRef.current?.click(); }}
        >
          <div className="icon">↑</div>
          <p><strong>{t('apply.workFile')}</strong></p>
          <p>{t('apply.workFileSub')}</p>
        </div>
      )}
    </div>
  );
}

// ─── Step 3: Review + Payment ───
function Step4({ form, workFiles, update, t }) {
  const empty = (val) => (val && val.trim()) ? val : t('apply.emptyField');
  const valClass = (val) => (val && val.trim()) ? 'val' : 'val empty';

  return (
    <>
      <span className="wizard-section-label">{t('apply.stepOf', { n: 3 })}</span>
      <h2>{t('apply.paymentTitle')}</h2>

      {/* Review: contacts */}
      <div className="review-section">
        <h4>{t('apply.reviewContact')}</h4>
        <div className="review-row"><span className="key">{t('apply.firstName')}</span><span className={valClass(form.firstName)}>{empty(form.firstName)}</span></div>
        <div className="review-row"><span className="key">{t('apply.lastName')}</span><span className={valClass(form.lastName)}>{empty(form.lastName)}</span></div>
        <div className="review-row"><span className="key">Email</span><span className={valClass(form.email)}>{empty(form.email)}</span></div>
        <div className="review-row"><span className="key">{t('contact.phone')}</span><span className={valClass(form.phone)}>{empty(form.phone)}</span></div>
        <div className="review-row"><span className="key">{t('apply.country')} / {t('apply.city')}</span><span className={valClass((form.country || '') + (form.city ? ', ' + form.city : ''))}>{empty((form.country || '') + (form.city ? ', ' + form.city : ''))}</span></div>
        <div className="review-row"><span className="key">{t('apply.website')}</span><span className={valClass(form.website)}>{empty(form.website)}</span></div>
        <div className="review-row"><span className="key">{t('apply.instagram')}</span><span className={valClass(form.instagram)}>{empty(form.instagram)}</span></div>
      </div>

      {/* Review: works */}
      {form.works.map((w, i) => (
        <div className="review-section" key={i}>
          <h4>{t('apply.workLabel', { n: i + 1 })}</h4>
          <div className="review-row"><span className="key">{t('apply.workTitleField')}</span><span className={valClass(w.title)}>{empty(w.title)}</span></div>
          <div className="review-row"><span className="key">{t('apply.workYear')}</span><span className={valClass(w.year)}>{empty(w.year)}</span></div>
          <div className="review-row"><span className="key">{t('apply.workMedia')}</span><span className={valClass(w.media)}>{empty(w.media)}</span></div>
          <div className="review-row"><span className="key">{t('apply.workSize')}</span><span className={valClass(w.size)}>{empty(w.size)}</span></div>
          <div className="review-row"><span className="key">{t('apply.workDesc')}</span><span className={valClass(w.desc)}>{empty(w.desc)}</span></div>
          <div className="review-row"><span className="key">{t('apply.workFile')}</span><span className={workFiles[i] ? 'val' : 'val empty'}>{workFiles[i] ? workFiles[i].name : t('apply.noFiles')}</span></div>
        </div>
      ))}

      {/* Payment method */}
      <div style={{ marginTop: '40px' }}>
        <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginBottom: '8px', color: 'var(--ink)' }}>
          {t('apply.paymentMethod')}
        </h4>
        <div className="review-row" style={{ paddingTop: '8px' }}>
          <span className="key">{t('apply.fee')}</span>
          <span className="val" style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem' }}>{feeFor(form.works.length)}</span>
        </div>

        <div className="pay-methods">
          <button type="button" className={`pay-method ${form.paymentChannel === 'byn' ? 'selected' : ''}`} onClick={() => update('paymentChannel', 'byn')}>
            <span className="pm-name">{t('apply.payByn')}</span>
            <span className="pm-desc">{feeFor(form.works.length)}</span>
          </button>
          <button type="button" className={`pay-method ${form.paymentChannel === 'intl' ? 'selected' : ''}`} onClick={() => update('paymentChannel', 'intl')}>
            <span className="pm-name">{t('apply.payIntl')}</span>
            <span className="pm-desc">≈ {eurFor(form.works.length)}</span>
          </button>
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
