// Pure i18n helpers, dependency-free so they can be unit-tested without RN/expo.

/** Resolve a dot path like "home.affirmationLabel" against a nested dictionary. */
export const lookup = (dict: any, path: string): unknown =>
  path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), dict);

/** Replace {name}-style placeholders; unknown placeholders are left intact. */
export const interpolate = (
  str: string,
  params?: Record<string, string | number>
): string =>
  params
    ? str.replace(/\{(\w+)\}/g, (_, k) => (params[k] !== undefined ? String(params[k]) : `{${k}}`))
    : str;

/**
 * Translate `key` against `dict`, falling back to `fallbackDict`, then the raw
 * key. Interpolates params into the resolved string.
 */
export const translateWith = (
  dict: any,
  fallbackDict: any,
  key: string,
  params?: Record<string, string | number>
): string => {
  const value = lookup(dict, key) ?? lookup(fallbackDict, key) ?? key;
  return typeof value === 'string' ? interpolate(value, params) : key;
};
