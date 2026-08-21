import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as Localization from 'expo-localization';
import { en } from './en';
import { ro } from './ro';
import { getLanguage as loadLanguage, setLanguage as persistLanguage } from '../services/storage';

export type Language = 'en' | 'ro';

const DICTS = { en, ro } as const;

/** Resolve a dot path like "home.affirmationLabel" against a dictionary. */
const lookup = (dict: any, path: string): string | undefined =>
  path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), dict);

const interpolate = (str: string, params?: Record<string, string | number>): string =>
  params
    ? str.replace(/\{(\w+)\}/g, (_, k) => (params[k] !== undefined ? String(params[k]) : `{${k}}`))
    : str;

export type TFunc = (key: string, params?: Record<string, string | number>) => string;

interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TFunc;
  ready: boolean;
}

const I18nContext = createContext<I18nContextValue>({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key,
  ready: false,
});

const deviceDefault = (): Language => {
  try {
    const code = Localization.getLocales?.()[0]?.languageCode ?? 'en';
    return code === 'ro' ? 'ro' : 'en';
  } catch {
    return 'en';
  }
};

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLang] = useState<Language>('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await loadLanguage();
      const initial = (saved as Language) || deviceDefault();
      setLang(initial);
      _setModuleLanguage(initial);
      setReady(true);
    })();
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLang(lang);
    _setModuleLanguage(lang);
    persistLanguage(lang).catch(() => {});
  }, []);

  const t = useCallback<TFunc>(
    (key, params) => {
      const value = lookup(DICTS[language], key) ?? lookup(DICTS.en, key) ?? key;
      return typeof value === 'string' ? interpolate(value, params) : key;
    },
    [language]
  );

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, ready }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);

// Standalone translator for non-React modules (services). Reads the module-level
// language kept in sync by the provider.
let currentLanguage: Language = 'en';
export const _setModuleLanguage = (lang: Language) => { currentLanguage = lang; };
export const translate: TFunc = (key, params) => {
  const value = lookup(DICTS[currentLanguage], key) ?? lookup(DICTS.en, key) ?? key;
  return typeof value === 'string' ? interpolate(value, params) : key;
};
