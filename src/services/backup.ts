// Export / import all local Stillnova data (profile, streaks, sessions, moods,
// journal, prefs…) as JSON — a real backup / device-migration for a local-first
// app. Everything lives under the `clarmind_` AsyncStorage prefix, so we dump and
// restore by prefix rather than a hand-kept key list (nothing gets missed).
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'clarmind_';
export const BACKUP_VERSION = 1;

export interface Backup {
  app: 'clarmind';
  version: number;
  exportedAt: string;
  data: Record<string, string>;
}

/** Serialize all Stillnova data to a JSON string. */
export const exportData = async (): Promise<string> => {
  const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX));
  const pairs = await AsyncStorage.multiGet(keys);
  const data: Record<string, string> = {};
  for (const [k, v] of pairs) if (v != null) data[k] = v;
  const backup: Backup = {
    app: 'clarmind',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
  return JSON.stringify(backup);
};

export interface ImportResult { imported: number; }

// The premium override must never be restored from anywhere (a crafted JSON
// would unlock Premium for free). The device id is the leaderboard identity:
// importing someone else's from a PASTED backup is identity takeover, but cloud
// sync (same signed-in account) legitimately restores it to keep one identity
// across the user's own devices.
const ALWAYS_BLOCK = new Set(['clarmind_premium_override']);
const PASTE_ONLY_BLOCK = new Set(['clarmind_device_id']);

/**
 * Write a `clarmind_*` key map to storage, replacing existing Stillnova data.
 * `trusted` (cloud sync) keeps the device id; untrusted (pasted backup) drops it.
 */
export const restoreState = async (
  data: Record<string, unknown>,
  opts?: { trusted?: boolean }
): Promise<number> => {
  const block = opts?.trusted ? ALWAYS_BLOCK : new Set([...ALWAYS_BLOCK, ...PASTE_ONLY_BLOCK]);
  const entries = Object.entries(data).filter(
    ([k, v]) => typeof k === 'string' && k.startsWith(PREFIX) && typeof v === 'string' && !block.has(k)
  ) as [string, string][];

  const existing = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX));
  if (existing.length) await AsyncStorage.multiRemove(existing);
  if (entries.length) await AsyncStorage.multiSet(entries);
  return entries.length;
};

/**
 * Restore from a PASTED backup string: validates it's a Stillnova backup, then
 * replaces the current Stillnova data with it. Throws on anything that isn't our
 * format. (Cloud sync uses restoreState directly with trusted: true.)
 */
export const importData = async (json: string): Promise<ImportResult> => {
  let parsed: any;
  try {
    parsed = JSON.parse(String(json).trim());
  } catch {
    throw new Error('invalid-json');
  }
  if (!parsed || parsed.app !== 'clarmind' || typeof parsed.data !== 'object' || Array.isArray(parsed.data)) {
    throw new Error('not-a-clarmind-backup');
  }
  const imported = await restoreState(parsed.data, { trusted: false });
  return { imported };
};
