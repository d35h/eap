import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from '../hooks/useTranslation.jsx';

// Core Eurasian audience pinned to the top; the rest is a broad world list.
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
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const pick = (name) => { onChange(name); setQuery(''); setOpen(false); };

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((i) => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && open && filtered[active]) { e.preventDefault(); pick(filtered[active].name); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  // Keep the active row in view.
  useEffect(() => {
    const el = listRef.current?.children[active];
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  return (
    <div className={`cselect ${open ? 'is-open' : ''}`} ref={wrapRef}>
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
        className={error ? 'error' : ''}
        placeholder={placeholder}
        value={open ? query : value}
        onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); setActive(0); }}
        onFocus={() => { setQuery(''); setOpen(true); setActive(0); }}
        onKeyDown={onKey}
      />
      <span className="cselect__chev" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
      </span>
      {open && filtered.length > 0 && (
        <ul className="cselect__list" ref={listRef} role="listbox">
          {filtered.map((x, i) => (
            <li
              key={x.c}
              role="option"
              aria-selected={value === x.name}
              className={`cselect__opt ${i === active ? 'is-active' : ''} ${x.pinned ? 'is-pinned' : ''} ${value === x.name ? 'is-current' : ''}`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => { e.preventDefault(); pick(x.name); }}
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
