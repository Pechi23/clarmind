// Rate-limits how often the user can switch app language. Each switch triggers
// AI content regeneration (a network + token cost), so we cap it: at most
// MAX_CHANGES_PER_DAY per calendar day, and a COOLDOWN between consecutive
// switches. Pure check logic is unit-tested; history is persisted per device.
import AsyncStorage from '@react-native-async-storage/async-storage';

export const MAX_CHANGES_PER_DAY = 3;
export const COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

const KEY = 'clarmind_lang_changes';

export type LimitReason = 'ok' | 'daily' | 'cooldown';

export interface LangLimitCheck {
  allowed: boolean;
  usedToday: number;
  remaining: number;
  waitMs: number;      // remaining cooldown in ms (0 when not cooling down)
  reason: LimitReason;
}

const sameDay = (a: number, b: number): boolean => {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
};

/** Pure decision: given the change history (ms timestamps) and now, may we switch? */
export const checkLanguageChange = (history: number[], now: number): LangLimitCheck => {
  const usedToday = history.filter((t) => sameDay(t, now)).length;
  const remaining = Math.max(0, MAX_CHANGES_PER_DAY - usedToday);
  const last = history.length ? Math.max(...history) : 0;
  const sinceLast = now - last;
  const waitMs = last && sinceLast < COOLDOWN_MS ? COOLDOWN_MS - sinceLast : 0;

  if (usedToday >= MAX_CHANGES_PER_DAY) {
    return { allowed: false, usedToday, remaining, waitMs: 0, reason: 'daily' };
  }
  if (waitMs > 0) {
    return { allowed: false, usedToday, remaining, waitMs, reason: 'cooldown' };
  }
  return { allowed: true, usedToday, remaining, waitMs: 0, reason: 'ok' };
};

/** Drop timestamps older than today — the daily cap only cares about today. */
export const pruneHistory = (history: number[], now: number): number[] =>
  history.filter((t) => sameDay(t, now));

export const getLangChangeHistory = async (): Promise<number[]> => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((n) => typeof n === 'number') : [];
  } catch {
    return [];
  }
};

/** Non-persisting check against the stored history. */
export const canChangeLanguageNow = async (now: number = Date.now()): Promise<LangLimitCheck> =>
  checkLanguageChange(await getLangChangeHistory(), now);

/** Record a successful language change (call only after an allowed switch). */
export const recordLanguageChange = async (now: number = Date.now()): Promise<void> => {
  try {
    const history = pruneHistory(await getLangChangeHistory(), now);
    history.push(now);
    await AsyncStorage.setItem(KEY, JSON.stringify(history));
  } catch {
    // Non-fatal: worst case the next check under-counts.
  }
};
