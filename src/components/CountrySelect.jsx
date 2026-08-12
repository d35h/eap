import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from '../hooks/useTranslation.jsx';

// Core Eurasia audience pinned to the top; the rest is a broad world list.
const PINNED = ['RU', 'KZ', 'UA', 'BY', 'UZ', 'KG', 'TJ', 'TM', 'AM', 'AZ', 'GE', 'MD'];
const REST = [
  'AF', 'AL', 'DZ', 'AD', 'AO', 'AR', 'AT', 'AU', 'BH', 'BD', 'BE', 'BA', 'BR', 'BG', 'KH', 'CM', 'CA',
  'CL', 'CN', 'CO', 'CR', 'HR', 'CU', 'CY', 'CZ', 'DK', 'DO', 'EC', 'EG', 'EE', 'ET', 'FI', 'FR', 'DE',
  'GH', 'GR', 'GT', 'HK', 'HU', 'IS', 'IN', 'ID', 'IR', 'IQ', 'IE', 'IL', 'IT', 'JM', 'JP', 'JO', 'KE',
  'KW', 'LV', 'LB', 'LY', 'LT', 'LU', 'MO', 'MK', 'MY', 'MT', 'MX', 'MN', 'ME', 'MA', 'NP', 'NL', 'NZ',
  'NG', 'NO', 'OM', 'PK', 'PS', 'PA', 'PY', 'PE', 'PH', 'PL', 'PT', 'QA', 'RO', 'SA', 'RS', 'SG', 'SK',
  'SI', 'ZA', 'KR', 'ES', 'LK', 'SE', 'CH', 'SY', 'TW', 'TH', 'TN', 'TR', 'AE', 'GB', 'US', 'UY', 'VE',
  'VN', 'YE',
];

export default function CountrySelect({ value = '', onChange, placeholder, error }) {
  const { lang } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const wrapRef = useRef(null);
  const listRef = useRef(null);

  const names = useMemo(() => {
    let dn;
    try { dn = new Intl.DisplayNames([lang || 'ru'], { type: 'region' }); } catch { dn = null; }
    const label = (c) => { try { return dn ? dn.of(c) : c; } catch { return c; } };
    const pinned = PINNED.map((c) => ({ c, name: label(c), pinned: true }));
    const rest = REST.map((c) => ({ c, name: label(c) }))
      .sort((a, b) => a.name.localeCompare(b.name, lang || 'ru'));
    return [...pinned, ...rest];
  }, [lang]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return names;
    return names.filter((x) => x.name.toLowerCase().includes(q));
  }, [names, query]);

  useEffect(() => {
    if (!open) return;
    // pointerdown to match the options, so a tap outside closes on the same
    // event a tap inside picks on - mousedown alone can arrive too late on a
    // phone, or not at all.
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, [open]);

  // Report both the localised name (stored & submitted) and the stable region
  // code, so the caller can re-translate the name when the language changes.
  const pick = (name, code) => { onChange(name, code); setQuery(''); setOpen(false); };

  // Show the whole list again, from the top, with nothing typed. Idempotent, so
  // it is safe on both focus and press - a first tap fires both.
  const reveal = () => {
    if (open) return;
    setQuery('');
    setOpen(true);
    setActive(0);
  };

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((i) => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && open && filtered[active]) { e.preventDefault(); pick(filtered[active].name, filtered[active].c); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  // Keep the active row in view.
  useEffect(() => {
    const el = listRef.current?.children[active];
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  // Place the list against the space that is actually visible. On a phone the
  // keyboard opens with the field and takes roughly half the screen: window
  // .innerHeight does not change, so a list measured against it drops straight
  // behind the keyboard and the options cannot be reached at all. visualViewport
  // does change, and it fires resize when the keyboard appears - so measure
  // against that, flip upwards when there is more room above, and never ask for
  // more height than the gap that is left.
  const [place, setPlace] = useState({ up: false, max: 290 });
  useEffect(() => {
    if (!open) { setPlace({ up: false, max: 290 }); return undefined; }
    const vv = window.visualViewport;
    const measure = () => {
      const r = wrapRef.current?.getBoundingClientRect();
      if (!r) return;
      const viewTop = vv ? vv.offsetTop : 0;
      const viewH = vv ? vv.height : window.innerHeight;
      const below = viewTop + viewH - r.bottom - 12;
      const above = r.top - viewTop - 12;
      const up = above > below;
      setPlace({ up, max: Math.max(132, Math.min(290, Math.round(up ? above : below))) });
    };
    measure();
    // The keyboard animates in, so one measurement at open time is too early.
    const t = setTimeout(measure, 350);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    vv?.addEventListener('resize', measure);
    vv?.addEventListener('scroll', measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
      vv?.removeEventListener('resize', measure);
      vv?.removeEventListener('scroll', measure);
    };
  }, [open]);

  return (
    <div className={`cselect ${open ? 'is-open' : ''} ${place.up ? 'is-up' : ''}`} ref={wrapRef}>
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
        className={error ? 'error' : ''}
        placeholder={placeholder}
        value={open ? query : value}
        onChange={(e) => { setQuery(e.target.value); onChange(e.target.value, ''); setOpen(true); setActive(0); }}
        onFocus={reveal}
        // Opening hung entirely off focus, and picking deliberately keeps focus
        // on the field - so after the first choice the input was already focused
        // and tapping it again fired nothing at all. The list could not be
        // reopened without first tapping somewhere else. Any press on the field
        // opens it, however many times you come back to it.
        onPointerDown={reveal}
        onKeyDown={onKey}
      />
      <span className="cselect__chev" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
      </span>
      {open && filtered.length > 0 && (
        <ul className="cselect__list" ref={listRef} role="listbox" style={{ maxHeight: `${place.max}px` }}>
          {filtered.map((x, i) => (
            <li
              key={x.c}
              role="option"
              aria-selected={value === x.name}
              className={`cselect__opt ${i === active ? 'is-active' : ''} ${x.pinned ? 'is-pinned' : ''} ${value === x.name ? 'is-current' : ''}`}
              onMouseEnter={() => setActive(i)}
              // pointerdown, not mousedown: it is the first event a finger
              // produces, so the choice is taken before the keyboard opening or
              // a stray scroll can move the row out from under the touch. It
              // covers the mouse identically. preventDefault keeps focus on the
              // field, which is what stops the list closing under us.
              onPointerDown={(e) => { e.preventDefault(); pick(x.name, x.c); }}
            >
              {x.name}
              {value === x.name && <span className="cselect__check" aria-hidden="true">✓</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
