import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from '../hooks/useTranslation.jsx';

// Major cities for the core Eurasian audience, keyed by ISO country code.
// Suggestions only — the field always accepts a free-typed value, and countries
// outside this map simply fall back to a plain text input.
const CITIES_BY_CODE = {
  RU: ['Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань', 'Нижний Новгород', 'Челябинск', 'Самара', 'Омск', 'Ростов-на-Дону', 'Уфа', 'Красноярск', 'Воронеж', 'Пермь', 'Волгоград', 'Краснодар', 'Саратов', 'Тюмень', 'Калининград', 'Владивосток', 'Сочи', 'Иркутск', 'Хабаровск', 'Тольятти'],
  KZ: ['Алматы', 'Астана', 'Шымкент', 'Караганда', 'Актобе', 'Тараз', 'Павлодар', 'Усть-Каменогорск', 'Семей', 'Атырау', 'Костанай', 'Кызылорда', 'Уральск', 'Петропавловск', 'Актау', 'Темиртау', 'Туркестан', 'Кокшетау'],
  UA: ['Киев', 'Харьков', 'Одесса', 'Днепр', 'Львов', 'Запорожье', 'Кривой Рог', 'Николаев', 'Винница', 'Полтава', 'Чернигов', 'Черкассы', 'Житомир', 'Ужгород', 'Ивано-Франковск'],
  BY: ['Минск', 'Гомель', 'Могилёв', 'Витебск', 'Гродно', 'Брест', 'Бобруйск', 'Барановичи', 'Пинск'],
  UZ: ['Ташкент', 'Самарканд', 'Наманган', 'Андижан', 'Нукус', 'Бухара', 'Фергана', 'Карши', 'Коканд', 'Хива'],
  KG: ['Бишкек', 'Ош', 'Джалал-Абад', 'Каракол', 'Токмок', 'Нарын', 'Талас'],
  TJ: ['Душанбе', 'Худжанд', 'Куляб', 'Бохтар', 'Истаравшан', 'Турсунзаде'],
  TM: ['Ашхабад', 'Туркменабат', 'Дашогуз', 'Мары', 'Балканабат'],
  AM: ['Ереван', 'Гюмри', 'Ванадзор', 'Вагаршапат', 'Капан'],
  AZ: ['Баку', 'Гянджа', 'Сумгаит', 'Мингечевир', 'Нахичевань', 'Шеки'],
  GE: ['Тбилиси', 'Батуми', 'Кутаиси', 'Рустави', 'Зугдиди', 'Гори'],
  MD: ['Кишинёв', 'Бельцы', 'Тирасполь', 'Бендеры', 'Кагул'],
  TR: ['Стамбул', 'Анкара', 'Измир', 'Анталья', 'Бурса', 'Адана'],
};

export default function CitySelect({ value = '', onChange, placeholder, country = '', error }) {
  const { lang } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const wrapRef = useRef(null);
  const listRef = useRef(null);

  // Resolve the selected country's ISO code by matching its localised name.
  const code = useMemo(() => {
    const target = country.trim().toLowerCase();
    if (!target) return null;
    let dn;
    try { dn = new Intl.DisplayNames([lang || 'ru'], { type: 'region' }); } catch { dn = null; }
    for (const c of Object.keys(CITIES_BY_CODE)) {
      const name = (dn ? dn.of(c) : c) || c;
      if (name.toLowerCase() === target) return c;
    }
    return null;
  }, [country, lang]);

  const cities = code ? CITIES_BY_CODE[code] : [];
  const hasSuggestions = cities.length > 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cities;
    return cities.filter((c) => c.toLowerCase().includes(q));
  }, [cities, query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    const el = listRef.current?.children[active];
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const pick = (city) => { onChange(city); setQuery(''); setOpen(false); };

  const onKey = (e) => {
    if (!hasSuggestions) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((i) => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && open && filtered[active]) { e.preventDefault(); pick(filtered[active]); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <div className={`cselect ${open ? 'is-open' : ''}`} ref={wrapRef}>
      <input
        type="text"
        role={hasSuggestions ? 'combobox' : 'textbox'}
        aria-expanded={hasSuggestions ? open : undefined}
        aria-autocomplete={hasSuggestions ? 'list' : undefined}
        autoComplete="off"
        className={error ? 'error' : ''}
        placeholder={placeholder}
        value={open ? query : value}
        onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); setActive(0); }}
        onFocus={() => { if (hasSuggestions) { setQuery(''); setOpen(true); setActive(0); } }}
        onKeyDown={onKey}
      />
      {hasSuggestions && (
        <span className="cselect__chev" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </span>
      )}
      {open && hasSuggestions && filtered.length > 0 && (
        <ul className="cselect__list" ref={listRef} role="listbox">
          {filtered.map((city, i) => (
            <li
              key={city}
              role="option"
              aria-selected={value === city}
              className={`cselect__opt ${i === active ? 'is-active' : ''} ${value === city ? 'is-current' : ''}`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => { e.preventDefault(); pick(city); }}
            >
              {city}
              {value === city && <span className="cselect__check" aria-hidden="true">✓</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
