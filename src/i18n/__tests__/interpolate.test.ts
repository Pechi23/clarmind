import { lookup, interpolate, translateWith } from '../interpolate';
import { en } from '../en';
import { ro } from '../ro';

describe('lookup', () => {
  it('resolves a nested dot path', () => {
    expect(lookup(en, 'home.affirmationLabel')).toBe("Today's Affirmation");
  });
  it('returns undefined for a missing path', () => {
    expect(lookup(en, 'home.nope.deep')).toBeUndefined();
  });
});

describe('interpolate', () => {
  it('replaces named placeholders', () => {
    expect(interpolate('Hi {name}!', { name: 'Ana' })).toBe('Hi Ana!');
  });
  it('coerces numbers', () => {
    expect(interpolate('+{xp} XP', { xp: 25 })).toBe('+25 XP');
  });
  it('leaves unknown placeholders intact', () => {
    expect(interpolate('Hi {name}', {})).toBe('Hi {name}');
  });
  it('returns the string unchanged with no params', () => {
    expect(interpolate('plain')).toBe('plain');
  });
});

describe('translateWith', () => {
  it('uses the primary dictionary', () => {
    expect(translateWith(ro, en, 'common.done')).toBe('Gata');
  });
  it('falls back to the fallback dictionary when the key is missing', () => {
    // Build a partial dict missing the key -> should fall back to en.
    const partial = { common: {} };
    expect(translateWith(partial, en, 'common.done')).toBe('Done');
  });
  it('returns the raw key when absent from both', () => {
    expect(translateWith({}, {}, 'totally.missing.key')).toBe('totally.missing.key');
  });
  it('interpolates params after resolving', () => {
    expect(translateWith(en, en, 'onboarding.zodiacSubtitle', { name: 'Ana' })).toContain('Ana');
  });
});

describe('dictionary integrity', () => {
  // Guard against a translator forgetting a key: ro must mirror en's shape.
  const paths = (obj: any, prefix = ''): string[] =>
    Object.entries(obj).flatMap(([k, v]) =>
      v && typeof v === 'object'
        ? paths(v, `${prefix}${k}.`)
        : [`${prefix}${k}`]
    );

  it('ro has every key en has, and vice versa', () => {
    const enPaths = paths(en).sort();
    const roPaths = paths(ro).sort();
    expect(roPaths).toEqual(enPaths);
  });

  it('no translated value is left empty', () => {
    for (const p of paths(ro)) {
      expect(String(lookup(ro, p)).length).toBeGreaterThan(0);
    }
  });
});
