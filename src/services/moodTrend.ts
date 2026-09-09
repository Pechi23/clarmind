// Aggregates logged moods into a daily trend for a small chart. We already store
// MoodEntry[] (1 = anxious … 5 = calm) but never visualize how it moves over time.
import { MoodEntry } from '../types';

export interface MoodPoint {
  day: string;          // YYYY-MM-DD (local)
  avg: number | null;   // average mood that day, or null if no entry
  count: number;
}

export interface MoodTrend {
  points: MoodPoint[];      // one per day, oldest → newest
  overallAvg: number | null;
  delta: number | null;     // later-half avg minus earlier-half avg (null if too few)
}

const pad = (n: number) => String(n).padStart(2, '0');
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Daily-average mood trend over the last `days` days. */
export const buildMoodTrend = (
  entries: MoodEntry[],
  days = 14,
  now: Date = new Date()
): MoodTrend => {
  const byDay = new Map<string, number[]>();
  for (const e of entries) {
    const d = new Date(e.date);
    if (isNaN(d.getTime()) || typeof e.mood !== 'number') continue;
    const k = dayKey(d);
    (byDay.get(k) ?? byDay.set(k, []).get(k)!).push(e.mood);
  }

  const points: MoodPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const arr = byDay.get(dayKey(d)) ?? [];
    const avg = arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    points.push({ day: dayKey(d), avg, count: arr.length });
  }

  const vals = points.filter((p) => p.avg != null).map((p) => p.avg as number);
  const overallAvg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;

  let delta: number | null = null;
  if (vals.length >= 4) {
    const h = Math.floor(vals.length / 2);
    const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
    delta = mean(vals.slice(-h)) - mean(vals.slice(0, h));
  }

  return { points, overallAvg, delta };
};
