import { getDeviceId } from '../deviceId';
import { remoteLeaderboardEnabled, submitScore, fetchTop } from '../leaderboardRemote';

describe('getDeviceId', () => {
  it('returns a stable v4-shaped uuid', async () => {
    const a = await getDeviceId();
    const b = await getDeviceId();
    expect(a).toBe(b); // cached + persisted
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe('leaderboardRemote (disabled — no EXPO_PUBLIC_LEADERBOARD_URL)', () => {
  it('reports disabled', () => {
    expect(remoteLeaderboardEnabled()).toBe(false);
  });
  it('submitScore is a no-op that never throws', async () => {
    await expect(
      submitScore({ name: 'A', zodiac: 'Leo', streak: 1, totalMinutes: 2, xp: 3 })
    ).resolves.toBeUndefined();
  });
  it('fetchTop returns [] when disabled', async () => {
    await expect(fetchTop('xp')).resolves.toEqual([]);
  });
});
