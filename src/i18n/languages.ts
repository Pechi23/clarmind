// Lightweight language metadata — no React/JSX, safe to import from services/tests.
export type Language = 'en' | 'ro' | 'it' | 'fr' | 'es';

export const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ro', label: 'Română', flag: '🇷🇴' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
];

/** Full language name for AI prompts. */
export const languageName = (lang: Language): string =>
  ({ en: 'English', ro: 'Romanian', it: 'Italian', fr: 'French', es: 'Spanish' }[lang] ?? 'English');
