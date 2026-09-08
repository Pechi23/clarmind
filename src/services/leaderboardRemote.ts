// Talks to the Cloudflare Worker leaderboard (leaderboard-worker/). Pure fetch —
// works on native and web. Disabled (and everything no-ops / returns []) when
// EXPO_PUBLIC_LEADERBOARD_URL isn't set, so the app falls back to the seeded board.
import { LeaderboardUser } from './leaderboard';
import { ZodiacSign } from '../constants/zodiac';
import { getDeviceId } from './deviceId';

const BASE = process.env.EXPO_PUBLIC_LEADERBOARD_URL;

export const remoteLeaderboardEnabled = (): boolean => !!BASE;

type MyScore = Pick<LeaderboardUser, 'name' | 'zodiac' | 'streak' | 'totalMinutes' | 'xp'>;

/** Push my current stats to the leaderboard. Best-effort; never throws. */
export const submitScore = async (me: MyScore): Promise<void> => {
  if (!BASE) return;
  try {
    const deviceId = await getDeviceId();
    await fetch(`${BASE}/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId, name: me.name, zodiac: me.zodiac,
        xp: me.xp, streak: me.streak, totalMinutes: me.totalMinutes,
      }),
    });
  } catch {
    // offline / server down — the screen falls back to seeded data.
  }
};

/** Fetch the top players by the given metric. Returns [] when unavailable. */
export const fetchTop = async (
  by: 'xp' | 'streak' | 'totalMinutes',
  limit = 25
): Promise<LeaderboardUser[]> => {
  if (!BASE) return [];
  const byParam = by === 'totalMinutes' ? 'minutes' : by;
  try {
    const deviceId = await getDeviceId();
    const res = await fetch(`${BASE}/top?by=${byParam}&limit=${limit}`, {
      headers: { 'X-Device-Id': deviceId },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.rows ?? []).map((r: any, i: number): LeaderboardUser => ({
      id: r.isYou ? 'me' : `remote-${i}`,
      name: String(r.name ?? 'Anon'),
      zodiac: r.zodiac as ZodiacSign,
      streak: Number(r.streak) || 0,
      totalMinutes: Number(r.totalMinutes) || 0,
      xp: Number(r.xp) || 0,
      isCurrentUser: !!r.isYou,
    }));
  } catch {
    return [];
  }
};
