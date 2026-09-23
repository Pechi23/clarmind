// Guards the exact bug George reported: with a non-English language selected,
// the language-limit warning pop-ups and other alerts/notifications must appear
// in that language, not fall back to English. Complements parity.test.ts with an
// explicit check of the alert + notification strings and their interpolation.
import { en } from '../en';
import { ro } from '../ro';
import { it as itLocale } from '../it';
import { fr } from '../fr';
import { es } from '../es';
import { de } from '../de';
import { pt } from '../pt';
import { lookup, translateWith } from '../interpolate';

const LOCALES: Record<string, any> = { ro, it: itLocale, fr, es, de, pt };

// The strings the user actually sees in a dialog/notification.
const ALERT_KEYS = [
  'profile.langLimitTitle',
  'profile.langLimitDaily',
  'profile.langLimitCooldown',
  'profile.langConfirmTitle',
  'profile.langConfirmMsg',
  'profile.langConfirmYes',
  'profile.resetTitle',
  'profile.resetMessage',
  'profile.permissionTitle',
  'profile.permissionMsg',
  'common.cancel',
  'share.unavailable',
];

const NOTIF_KEYS = [
  'notifications.channelName',
  'notifications.generic.0',
  'notifications.generic.1',
  'notifications.generic.2',
  'notifications.generic.3',
  'notifications.generic.4',
  'notifications.streakNext',
  'notifications.streakSave',
  'notifications.newStar',
];

describe.each(Object.entries(LOCALES))('alerts + notifications are localized in %s', (_code, dict) => {
  it('defines every alert string directly (no English fallback)', () => {
    for (const key of ALERT_KEYS) {
      expect(lookup(dict, key)).toBeDefined();
      expect(String(lookup(dict, key)).trim().length).toBeGreaterThan(0);
    }
  });

  it('defines every notification string directly (no English fallback)', () => {
    for (const key of NOTIF_KEYS) {
      expect(lookup(dict, key)).toBeDefined();
    }
  });

  it('interpolates the cooldown/confirm placeholders without leaking braces', () => {
    const cooldown = translateWith(dict, en, 'profile.langLimitCooldown', { min: 15 });
    expect(cooldown).toContain('15');
    expect(cooldown).not.toMatch(/\{min\}/);

    const confirm = translateWith(dict, en, 'profile.langConfirmMsg', { remaining: 2 });
    expect(confirm).toContain('2');
    expect(confirm).not.toMatch(/\{remaining\}/);
  });

  it('interpolates notification rank/streak placeholders', () => {
    const next = translateWith(dict, en, 'notifications.streakNext', { next: 5, rank: 'Zen' });
    expect(next).toContain('5');
    expect(next).toContain('Zen');
    expect(next).not.toMatch(/\{next\}|\{rank\}/);

    const save = translateWith(dict, en, 'notifications.streakSave', { streak: 7 });
    expect(save).toContain('7');
    expect(save).not.toMatch(/\{streak\}/);
  });
});

// The clearest signal of the original bug: at least the alert titles should be
// genuinely translated (differ from English) in the languages George tested.
describe('alert titles are actually translated (not English)', () => {
  it('Spanish and French language-limit titles differ from English', () => {
    expect(lookup(es, 'profile.langLimitTitle')).not.toBe(lookup(en, 'profile.langLimitTitle'));
    expect(lookup(fr, 'profile.langLimitTitle')).not.toBe(lookup(en, 'profile.langLimitTitle'));
    expect(lookup(es, 'profile.langConfirmYes')).not.toBe(lookup(en, 'profile.langConfirmYes'));
  });
});
