// Every locale must mirror en.ts exactly: same keys, no empty values, same
// {placeholders}, and no em/en dashes (house rule). This is the guard that
// stops "Spanish shows English" from shipping again.
import { en } from '../en';
import { ro } from '../ro';
import { it as itLocale } from '../it'; // aliased: `it` is Jest's test fn
import { fr } from '../fr';
import { es } from '../es';
import { de } from '../de';
import { pt } from '../pt';
import { lookup } from '../interpolate';

const LOCALES: Record<string, any> = { ro, it: itLocale, fr, es, de, pt };

const paths = (obj: any, prefix = ''): string[] =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? paths(v, `${prefix}${k}.`) : [`${prefix}${k}`]
  );

const placeholders = (s: string): string[] =>
  (s.match(/\{(\w+)\}/g) ?? []).sort();

const enPaths = paths(en).sort();

describe.each(Object.entries(LOCALES))('locale %s', (code, dict) => {
  it('has every key that en has', () => {
    const missing = enPaths.filter((p) => lookup(dict, p) === undefined);
    expect(missing).toEqual([]);
  });

  it('has no keys that en lacks', () => {
    const extra = paths(dict).filter((p) => lookup(en, p) === undefined);
    expect(extra).toEqual([]);
  });

  it('has no empty values', () => {
    const empty = paths(dict).filter((p) => String(lookup(dict, p)).trim().length === 0);
    expect(empty).toEqual([]);
  });

  it('keeps the same {placeholders} as en', () => {
    const bad = enPaths.filter((p) => {
      const a = lookup(en, p);
      const b = lookup(dict, p);
      return typeof a === 'string' && typeof b === 'string' &&
        placeholders(a).join(',') !== placeholders(b).join(',');
    });
    expect(bad).toEqual([]);
  });

  it('contains no em or en dashes', () => {
    const dashed = paths(dict).filter((p) => /[–—]/.test(String(lookup(dict, p))));
    expect(dashed).toEqual([]);
  });
});

describe('en itself', () => {
  it('contains no em or en dashes', () => {
    expect(enPaths.filter((p) => /[–—]/.test(String(lookup(en, p))))).toEqual([]);
  });
});
