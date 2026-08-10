import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getTranslation } from '../i18n';

const LanguageContext = createContext({
  lang: 'ru',
  setLang: () => {},
  t: (key) => key,
});

const STORAGE_KEY = 'eap-lang';

// Our internal code for Kazakh is the country code; <html lang> needs the
// ISO 639-1 language code. Everything else already matches.
const HTML_LANG = { kz: 'kk' };

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    if (typeof window === 'undefined') return 'ru';
    return localStorage.getItem(STORAGE_KEY) || 'ru';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = HTML_LANG[lang] || lang;
  }, [lang]);

  const setLang = useCallback((newLang) => {
    setLangState(newLang);
  }, []);

  const t = useCallback(
    (key, vars) => {
      let value = getTranslation(lang, key);
      if (typeof value === 'string' && vars) {
        for (const [k, v] of Object.entries(vars)) {
          value = value.replace(`{${k}}`, v);
        }
      }
      return value;
    },
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}
