// Pure sync-decision logic (no imports, so it's unit-testable without the
// native auth/supabase chain).

/** Given cloud + local timestamps, decide whether to restore from cloud or push local. */
export const decideSync = (cloudUpdatedAt: number | null, lastSync: number): 'restore' | 'push' => {
  if (cloudUpdatedAt === null) return 'push';   // nothing in the cloud yet
  return cloudUpdatedAt > lastSync ? 'restore' : 'push';
};
