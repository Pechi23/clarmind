// Cloud sync of the user's data to Supabase (only when signed in). Reuses the
// backup serializer: the whole `clarmind_*` state (birth details, streaks,
// sessions, moods, prefs, AND the leaderboard device id) is stored as one JSON
// blob per user, so restoring on a new device brings back progress and keeps the
// same leaderboard identity. Newest-wins between device and cloud.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, getCurrentUser } from './auth';
import { exportData, importData } from './backup';
import { resetDeviceIdCache } from './deviceId';
import { decideSync } from './syncLogic';

const TABLE = 'user_data';
const LAST_SYNC = 'clarmind_last_sync';

export type SyncResult = 'restored' | 'pushed' | 'noop';
export { decideSync };

export const syncAvailable = (): boolean => !!supabase;

const getLastSync = async (): Promise<number> => {
  try { return Number((await AsyncStorage.getItem(LAST_SYNC)) || 0) || 0; } catch { return 0; }
};
const setLastSync = async (ms: number): Promise<void> => {
  try { await AsyncStorage.setItem(LAST_SYNC, String(ms)); } catch {}
};

/** Read the signed-in user's cloud blob, or null if none / not signed in. */
export const pullUserData = async (): Promise<{ data: any; updatedAt: number } | null> => {
  if (!supabase) return null;
  const user = await getCurrentUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from(TABLE)
    .select('data, updated_at')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error || !data) return null;
  return { data: (data as any).data, updatedAt: new Date((data as any).updated_at).getTime() };
};

/** Upload the current local state to the cloud. Returns true on success. */
export const pushUserData = async (): Promise<boolean> => {
  if (!supabase) return false;
  const user = await getCurrentUser();
  if (!user) return false;
  const now = Date.now();
  const blob = JSON.parse(await exportData());
  const { error } = await supabase
    .from(TABLE)
    .upsert({ user_id: user.id, data: blob, updated_at: new Date(now).toISOString() });
  if (error) return false;
  await setLastSync(now);
  return true;
};

/**
 * Reconcile on login (or app start when already signed in): restore the cloud
 * copy if it's newer than our last sync, otherwise push the local copy up.
 */
export const syncOnLogin = async (): Promise<SyncResult> => {
  if (!supabase) return 'noop';
  const user = await getCurrentUser();
  if (!user) return 'noop';
  const cloud = await pullUserData();
  const lastSync = await getLastSync();
  const action = decideSync(cloud ? cloud.updatedAt : null, lastSync);
  if (action === 'restore' && cloud) {
    await importData(JSON.stringify(cloud.data));
    resetDeviceIdCache(); // the restored blob carries the account's device id
    await setLastSync(cloud.updatedAt);
    return 'restored';
  }
  const ok = await pushUserData();
  return ok ? 'pushed' : 'noop';
};

/** Fire-and-forget backup used on app background / after activity. */
export const backupIfSignedIn = async (): Promise<void> => {
  try { if (supabase && (await getCurrentUser())) await pushUserData(); } catch {}
};
