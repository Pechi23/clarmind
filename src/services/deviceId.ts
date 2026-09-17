// A stable, anonymous per-device id for the leaderboard. Random UUID kept only on
// this device (AsyncStorage) — it's what proves "this row is mine" without a login.
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'clarmind_device_id';
let cached: string | null = null;

const uuid = (): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

/** Get (or lazily create + persist) this device's anonymous id. */
export const getDeviceId = async (): Promise<string> => {
  if (cached) return cached;
  let id: string | null = null;
  try { id = await AsyncStorage.getItem(KEY); } catch {}
  if (!id) {
    id = uuid();
    try { await AsyncStorage.setItem(KEY, id); } catch {}
  }
  cached = id;
  return id;
};

/** Clear the in-memory cache so the next read picks up a restored id (after a cloud sync). */
export const resetDeviceIdCache = (): void => { cached = null; };
