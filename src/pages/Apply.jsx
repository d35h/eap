import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation.jsx';
import { useFormPersist } from '../hooks/useFormPersist.js';
import { submitApplication, uploadWorkFiles } from '../lib/applicationsRepo.js';
import CountrySelect from '../components/CountrySelect.jsx';
import { startPayment } from '../lib/payments.js';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { useSubmissionsOpen } from '../lib/useSubmissionsOpen.js';

const emptyWork = () => ({ title: '', year: '', media: '', size: '', desc: '' });

const INITIAL = {
  firstName: '', lastName: '', email: '', phone: '', country: '', countryCode: '', city: '',
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
  const { t, lang } = useTranslation();
  const navigate = useNavigate();

  const [form, setForm, clearForm, justSaved] = useFormPersist('eap-apply-form-v2', INITIAL);

  // Default the country to Belarus (localised) for a fresh form — most applicants
  // are local. Never overrides a value already entered or restored from a draft.
  const regionName = (code, fallback) => {
    try { return new Intl.DisplayNames([lang || 'ru'], { type: 'region' }).of(code) || fallback; }
    catch { return fallback; }
  };

  useEffect(() => {
    if (form.country) return;
    setForm((f) => (f.country ? f : { ...f, country: regionName('BY', 'Беларусь'), countryCode: 'BY' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the language changes, re-translate the chosen country so it never
  // stays in the previous language. Only when picked from the list (has a code);
  // free-typed text is left as the user wrote it.
  useEffect(() => {
    if (!form.countryCode) return;
    const name = regionName(form.countryCode, form.country);
    setForm((f) => (f.country === name ? f : { ...f, country: name }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);
  const [step, setStep] = useState(1);
  // The intro is skipped for anyone returning to a draft they have begun.
  const [started, setStarted] = useState(
    () => Boolean(form.firstName || form.lastName || form.email || form.works?.[0]?.title),
  );
  // Файлы не сохраняются в localStorage (File нельзя сериализовать). Параллельно works по индексу.
  const [workFiles, setWorkFiles] = useState(() => form.works.map(() => null));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ref, setRef] = useState('');
  const [sentTo, setSentTo] = useState('');
  const submOpen = useSubmissionsOpen(); // undefined = loading, then true/false
  const closed = submOpen === false;

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('status') === 'success') {
      clearForm();
      try {
        setRef(sessionStorage.getItem('eap-apply-ref') || '');
        setSentTo(sessionStorage.getItem('eap-apply-email') || '');
      } catch { /* ignore */ }
      setSuccess(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (file && errors[`w${i}File`]) setErrors((e) => ({ ...e, [`w${i}File`]: null }));
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
        if (!workFiles[i]) e[`w${i}File`] = t('apply.imageRequired');
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
    // Backstop: never submit with an invalid step (e.g. a work missing its image).
    const e1 = validateStep(1);
    if (Object.keys(e1).length) { setErrors(e1); setStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    const e2 = validateStep(2);
    if (Object.keys(e2).length) { setErrors(e2); setStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    setSubmitting(true);
    try {
      if (isSupabaseConfigured()) {
        const application = await submitApplication({ ...form, tier: form.works.length });
        // The provider returns to ?status=success with nothing of ours attached,
        // so the reference has to be parked before we leave the page.
        try {
          sessionStorage.setItem('eap-apply-ref', application.id);
          // The form is cleared on return, so the address has to travel too.
          sessionStorage.setItem('eap-apply-email', form.email || '');
        } catch { /* ignore */ }
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
            <span className="success-mark" aria-hidden="true">{t('apply.successOk')}</span>
            <h2 className="success-title">{t('apply.successTitle')}</h2>
            <p className="success-desc">{t('apply.successDesc')}</p>

            {sentTo && (
              <p className="success-sentto">
                <span>{t('apply.successSentTo')}</span>
                <strong>{sentTo}</strong>
              </p>
            )}

            {ref && (
              <p className="success-ref">
                <span>{t('apply.successRefWord')}</span>
                <strong>{`EAP-${String(ref).slice(0, 8).toUpperCase()}`}</strong>
              </p>
            )}

            <Link to="/" className="success-back">
              <span>{t('apply.successBack')}</span>
              <span aria-hidden="true">&#10230;</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (submOpen === undefined) {
    return (
      <div className="apply-page">
        <div className="container">
          <div className="apply-loading" aria-busy="true" aria-label={t('apply.eyebrow')}>
            <span className="apply-loading__spin" />
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
        {!started && (
          <div className="apply-intro">
            <span className="eyebrow">{t('apply.eyebrow')}</span>
            <h1 className="apply-intro__title">{t('apply.introTitle')}</h1>
            <p className="apply-intro__lead">{t('apply.introLead')}</p>
            <p className="apply-intro__meta">{t('apply.introMeta')}</p>

            <div className="apply-intro__need">
              <span className="apply-intro__needTitle">{t('apply.introNeedTitle')}</span>
              <ul>
                <li>{t('apply.introNeed1')}</li>
                <li>{t('apply.introNeed2')}</li>
                <li>{t('apply.introNeed3')}</li>
              </ul>
            </div>

            <button type="button" className="apply-intro__start" onClick={() => setStarted(true)}>
              <span>{t('apply.introStart')}</span>
              <span aria-hidden="true">&#10230;</span>
            </button>
          </div>
        )}

        <div className="apply-head" hidden={!started}>
          <span className="eyebrow">{t('apply.eyebrow')}</span>
          <h1>
            {t('apply.titlePart1')}
            <em>{t('apply.titleEm')}</em>
            {t('apply.titlePart2')}
          </h1>
          <p className="lead">{t('apply.lead')}</p>
          <div className={`draft-note ${justSaved ? 'visible' : ''}`} role="status" aria-live="polite">
            {t('apply.draftSaved')}
          </div>
        </div>

        <div className="wizard" hidden={!started}>
          <div className="wizard-count" aria-hidden="true">
            <span>{String(step).padStart(2, '0')}</span>
            <span className="wizard-count__of">/ 03</span>
          </div>

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

          {/* Nav - ruled rows rather than buttons, matching the rest of the site */}
          <div className="wizard-nav">
            <button
              className="wnav wnav--back"
              onClick={goBack}
              disabled={step === 1 || submitting}
              type="button"
            >
              <span aria-hidden="true">&#10229;</span>
              <span>{t('apply.back').replace(/^[←\s]+/, '')}</span>
            </button>

            {step < 3 ? (
              <button className="wnav wnav--next" onClick={goNext} type="button">
                <span>{t('apply.continueTo')}</span>
                <span aria-hidden="true">&#10230;</span>
              </button>
            ) : (
              <button
                className="wnav wnav--next"
                onClick={submitFinal}
                disabled={submitting}
                type="button"
              >
                <span>{submitting ? t('apply.submitting') : t('apply.submit')}</span>
                <span aria-hidden="true">&#10230;</span>
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
        <div className="field-group">
          <label>{t('apply.country')}</label>
          <CountrySelect
            value={form.country}
            placeholder={t('apply.countryPh')}
            onChange={(name, code) => {
              setForm((f) => ({ ...f, country: name, countryCode: code || '' }));
              if (errors.country) setErrors((e) => ({ ...e, country: null }));
            }}
          />
        </div>
        <Field label={t('apply.city')} value={form.city} ph={t('apply.cityPh')}
               onChange={(v) => update('city', v)} />
        <Field label={t('apply.website')} type="url" value={form.website} ph={t('apply.websitePh')}
               hint={t('apply.websiteHint')} onChange={(v) => update('website', v)} />
        <Field label={t('apply.instagram')} value={form.instagram} ph={t('apply.instagramPh')}
               hint={t('apply.instagramHint')} onChange={(v) => update('instagram', v)} />
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
  const [preview, setPreview] = useState(null);

  // Live thumbnail of the uploaded image, so the artist sees exactly what they sent.
  useEffect(() => {
    if (file && file.type && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreview(null);
  }, [file]);

  const handleFiles = (fileList) => {
    const f = fileList && fileList[0];
    if (!f) return;
    if (f.size > 25 * 1024 * 1024) {
      alert(t('apply.fileTooLarge'));
      return;
    }
    onFile(f);
  };

  const ext = file ? (file.name.split('.').pop() || '').toUpperCase().slice(0, 4) : '';

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
        <div className="work-file">
          <span className="work-file__thumb">
            {preview ? <img src={preview} alt={work.title || ''} /> : <span className="work-file__ext">{ext || 'FILE'}</span>}
          </span>
          <span className="work-file__meta">
            <span className="work-file__name">{file.name}</span>
            <span className="work-file__size">{fmtSize(file.size)}</span>
          </span>
          <button type="button" className="work-file__replace" onClick={() => inputRef.current?.click()}>{t('apply.replaceFile')}</button>
          <button type="button" className="work-file__remove" onClick={() => onFile(null)} aria-label={t('apply.removeFile')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
      ) : (
        <div
          className={`dropzone ${dragOver ? 'dragover' : ''} ${errors[`w${index}File`] ? 'error' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') inputRef.current?.click(); }}
        >
          <span className="dropzone__icon" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/>
            </svg>
          </span>
          <p className="dropzone__title"><strong>{t('apply.workFile')}</strong></p>
          <p className="dropzone__sub">{t('apply.workFileSub')}</p>
        </div>
      )}
      {errors[`w${index}File`] && <span className="field-error" role="alert">{errors[`w${index}File`]}</span>}
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
let fieldSeq = 0;
function Field({ label, required, value, onChange, onBlur, ph, error, help, hint, type = 'text', textarea, full }) {
  const { t } = useTranslation();
  const [id] = useState(() => `f${++fieldSeq}`);
  const [ownError, setOwnError] = useState(null);

  // The step-level check only runs on Continue, so a field left empty said
  // nothing until then. It answers for itself on the way out - but never
  // before it has been visited, which would be an accusation.
  const leave = () => {
    setOwnError(required && !String(value ?? '').trim() ? t('apply.required') : null);
    onBlur?.();
  };
  const clear = (v) => { if (ownError) setOwnError(null); onChange(v); };
  const shown = error || ownError;
  return (
    <div className={`field-group ${full ? 'full' : ''}`}>
      <label htmlFor={id}>
        {label} {required && <span className="req">*</span>}
        {hint && (
          <span className="field-tip">
            <button type="button" className="field-tip__btn" aria-label={hint}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="M9.1 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3" /><path d="M12 17h.01" />
              </svg>
            </button>
            <span className="field-tip__bubble" role="tooltip">{hint}</span>
          </span>
        )}
      </label>
      {textarea ? (
        <textarea
          id={id}
          placeholder={ph}
          value={value}
          onChange={(e) => clear(e.target.value)}
          onBlur={leave}
          aria-invalid={shown ? 'true' : undefined}
          aria-describedby={shown ? `${id}-err` : undefined}
          className={shown ? 'error' : ''}
        />
      ) : (
        <input
          id={id}
          type={type}
          placeholder={ph}
          value={value}
          onChange={(e) => clear(e.target.value)}
          onBlur={leave}
          aria-invalid={shown ? 'true' : undefined}
          aria-describedby={shown ? `${id}-err` : undefined}
          className={shown ? 'error' : ''}
        />
      )}
      <span className="field-error" id={`${id}-err`}>{shown}</span>
      {help && <span className="field-help">{help}</span>}
    </div>
  );
}
