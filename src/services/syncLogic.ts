// Pure sync-decision + merge logic (no imports, so it's unit-testable without the
// native auth/supabase chain).

/** Given cloud + local timestamps, decide whether to restore from cloud or push local. */
export const decideSync = (cloudUpdatedAt: number | null, lastSync: number): 'restore' | 'push' => {
  if (cloudUpdatedAt === null) return 'push';   // nothing in the cloud yet
  return cloudUpdatedAt > lastSync ? 'restore' : 'push';
};

export type Blob = Record<string, string>;

// Append-only collections: union both sides so nothing is ever dropped.
const ARRAY_UNION_KEYS = [
  'clarmind_meditation_sessions',
  'clarmind_mood_entries',
  'clarmind_reflections',
  'clarmind_chat_history',
  'clarmind_achievements_unlocked',
];
// Monotonic counters: take the larger so progress is never rolled back.
const MAX_KEYS = ['clarmind_streak', 'clarmind_xp_total', 'clarmind_shields'];

const toNum = (s: string): number => { const n = parseInt(s, 10); return Number.isFinite(n) ? n : 0; };

const unionArray = (a: string, b: string): string => {
  try {
    const pa = JSON.parse(a);
    const pb = JSON.parse(b);
    if (!Array.isArray(pa) || !Array.isArray(pb)) return a;
    const seen = new Set<string>();
    const out: unknown[] = [];
    for (const item of [...pa, ...pb]) {
      const key = JSON.stringify(item);
      if (!seen.has(key)) { seen.add(key); out.push(item); }
    }
    return JSON.stringify(out);
  } catch {
    return a;
  }
};

/**
 * Non-destructively merge two `clarmind_*` blobs so a two-device user never loses
 * data: append-only collections are unioned, counters take the max, and other
 * scalars (profile, prefs, language, device id) take the newer side (`preferCloud`).
 * Every key present on either side survives.
 */
export const mergeBlobs = (local: Blob, cloud: Blob, preferCloud: boolean): Blob => {
  const l = local || {};
  const c = cloud || {};
  const keys = new Set([...Object.keys(l), ...Object.keys(c)]);
  const out: Blob = {};
  for (const k of keys) {
    const lv = l[k];
    const cv = c[k];
    if (lv === undefined) { out[k] = cv; continue; }
    if (cv === undefined) { out[k] = lv; continue; }
    if (ARRAY_UNION_KEYS.includes(k)) { out[k] = unionArray(lv, cv); continue; }
    if (MAX_KEYS.includes(k)) { out[k] = String(Math.max(toNum(lv), toNum(cv))); continue; }
    out[k] = preferCloud ? cv : lv;
  }
  return out;
};
