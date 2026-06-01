import { useState, useEffect, useRef } from 'react';

/**
 * Сохраняет состояние формы в localStorage.
 * Возвращает [state, setState, clear, justSaved].
 * justSaved становится true на короткое время после изменения — для индикатора "Сохранено".
 */
export function useFormPersist(key, initialState) {
  const [state, setState] = useState(() => {
    if (typeof window === 'undefined') return initialState;
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        return { ...initialState, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to read saved form:', e);
    }
    return initialState;
  });

  const [justSaved, setJustSaved] = useState(false);
  const savedTimeoutRef = useRef(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save form:', e);
    }

    setJustSaved(true);
    if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    savedTimeoutRef.current = setTimeout(() => setJustSaved(false), 1500);

    return () => {
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    };
  }, [key, state]);

  const clear = () => {
    localStorage.removeItem(key);
    setState(initialState);
  };

  return [state, setState, clear, justSaved];
}
