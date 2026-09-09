// Export / import all local ClarMind data (profile, streaks, sessions, moods,
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

/** Serialize all ClarMind data to a JSON string. */
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

/**
 * Restore from a backup string: validates it's a ClarMind backup, then REPLACES
 * the current ClarMind data with it. Throws on anything that isn't our format.
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
  const entries = Object.entries(parsed.data).filter(
    ([k, v]) => typeof k === 'string' && k.startsWith(PREFIX) && typeof v === 'string'
  ) as [string, string][];

  // Replace existing ClarMind data so a restore is exact (not a merge).
  const existing = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX));
  if (existing.length) await AsyncStorage.multiRemove(existing);
  if (entries.length) await AsyncStorage.multiSet(entries);
  return { imported: entries.length };
};
