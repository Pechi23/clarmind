import { decideSync, mergeBlobs } from '../syncLogic';

describe('mergeBlobs (no data loss between two devices)', () => {
  const arr = (xs: any[]) => JSON.stringify(xs);

  it('unions append-only collections so neither device loses sessions', () => {
    const local = { clarmind_meditation_sessions: arr([{ date: '2026-01-01', completedAt: 'A' }]) };
    const cloud = { clarmind_meditation_sessions: arr([{ date: '2026-01-02', completedAt: 'B' }]) };
    const merged = mergeBlobs(local, cloud, true);
    const sessions = JSON.parse(merged.clarmind_meditation_sessions);
    expect(sessions).toHaveLength(2);
    expect(sessions.map((s: any) => s.completedAt).sort()).toEqual(['A', 'B']);
  });

  it('dedupes identical entries in the union', () => {
    const same = arr([{ date: '2026-01-01', completedAt: 'A' }]);
    const merged = mergeBlobs({ clarmind_mood_entries: same }, { clarmind_mood_entries: same }, false);
    expect(JSON.parse(merged.clarmind_mood_entries)).toHaveLength(1);
  });

  it('takes the max of monotonic counters (never rolls back progress)', () => {
    const merged = mergeBlobs(
      { clarmind_xp_total: '500', clarmind_streak: '3' },
      { clarmind_xp_total: '200', clarmind_streak: '9' },
      true,
    );
    expect(merged.clarmind_xp_total).toBe('500');
    expect(merged.clarmind_streak).toBe('9');
  });

  it('keeps keys present on only one side', () => {
    const merged = mergeBlobs({ clarmind_a: '1' }, { clarmind_b: '2' }, true);
    expect(merged).toEqual({ clarmind_a: '1', clarmind_b: '2' });
  });

  it('scalars follow preferCloud (newer side wins)', () => {
    expect(mergeBlobs({ clarmind_language: 'en' }, { clarmind_language: 'es' }, true).clarmind_language).toBe('es');
    expect(mergeBlobs({ clarmind_language: 'en' }, { clarmind_language: 'es' }, false).clarmind_language).toBe('en');
  });

  it("preserves offline activity: the scenario that used to wipe phone B", () => {
    // Phone B meditated offline (has a session); cloud from phone A is "newer".
    const phoneB = { clarmind_meditation_sessions: arr([{ completedAt: 'B-offline' }]), clarmind_xp_total: '150' };
    const cloudA = { clarmind_meditation_sessions: arr([{ completedAt: 'A' }]), clarmind_xp_total: '100' };
    const merged = mergeBlobs(phoneB, cloudA, true);
    const sessions = JSON.parse(merged.clarmind_meditation_sessions).map((s: any) => s.completedAt);
    expect(sessions).toContain('B-offline'); // not wiped
    expect(sessions).toContain('A');
    expect(merged.clarmind_xp_total).toBe('150');
  });
});

describe('decideSync', () => {
  it('pushes when the cloud is empty', () => {
    expect(decideSync(null, 0)).toBe('push');
    expect(decideSync(null, 12345)).toBe('push');
  });
  it('restores when the cloud is newer than our last sync', () => {
    expect(decideSync(2000, 1000)).toBe('restore');
  });
  it('pushes when local is newer or equal (we have newer changes)', () => {
    expect(decideSync(1000, 2000)).toBe('push');
    expect(decideSync(1000, 1000)).toBe('push');
  });
  it('restores on a fresh device (never synced) when the cloud has data', () => {
    expect(decideSync(5000, 0)).toBe('restore');
  });
});
