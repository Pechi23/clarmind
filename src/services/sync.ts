// Cloud sync of the user's data to Supabase (only when signed in). Reuses the
// backup serializer: the whole `clarmind_*` state (birth details, streaks,
// sessions, moods, prefs, AND the leaderboard device id) is stored as one JSON
// blob per user, so restoring on a new device brings back progress and keeps the
// same leaderboard identity. Newest-wins between device and cloud.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, getCurrentUser } from './auth';
import { exportData, restoreState, BACKUP_VERSION } from './backup';
import { resetDeviceIdCache } from './deviceId';
import { decideSync, mergeBlobs, Blob } from './syncLogic';

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

// The cloud row stores a Backup object ({app,version,exportedAt,data}); pull its
// inner key map. Handles either shape defensively.
const blobDataOf = (v: any): Blob =>
  (v && typeof v === 'object' && v.data && typeof v.data === 'object' && !Array.isArray(v.data))
    ? v.data as Blob
    : (v && typeof v === 'object' ? v as Blob : {});

/**
 * Reconcile on login (or app start when already signed in). Instead of a
 * destructive newest-wins restore (which wiped a device that had offline
 * activity), MERGE local and cloud so neither side loses data: append-only
 * collections union, counters take the max, scalars take the newer side. The
 * merged result is written locally and pushed back so the cloud holds the union.
 */
export const syncOnLogin = async (): Promise<SyncResult> => {
  if (!supabase) return 'noop';
  const user = await getCurrentUser();
  if (!user) return 'noop';

  const cloud = await pullUserData();
  const localMap = JSON.parse(await exportData()).data as Blob;

  // Nothing in the cloud yet: just push local up.
  if (!cloud) {
    const ok = await pushUserData();
    return ok ? 'pushed' : 'noop';
  }

  const lastSync = await getLastSync();
  const preferCloud = cloud.updatedAt > lastSync; // cloud is newer than our last sync
  const cloudMap = blobDataOf(cloud.data);
  const merged = mergeBlobs(localMap, cloudMap, preferCloud);

  // Write the merged state locally (trusted: keep the account's device identity).
  await restoreState(merged, { trusted: true });
  resetDeviceIdCache();

  // Push the merged union back so the cloud copy also has everything.
  const now = Date.now();
  const { error } = await supabase.from(TABLE).upsert({
    user_id: user.id,
    data: { app: 'clarmind', version: BACKUP_VERSION, exportedAt: new Date(now).toISOString(), data: merged },
    updated_at: new Date(now).toISOString(),
  });
  if (!error) await setLastSync(now);
  return preferCloud ? 'restored' : 'pushed';
};

/** Fire-and-forget backup used on app background / after activity. */
export const backupIfSignedIn = async (): Promise<void> => {
  try { if (supabase && (await getCurrentUser())) await pushUserData(); } catch {}
};
