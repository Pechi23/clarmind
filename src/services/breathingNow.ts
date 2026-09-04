// Ambient "minds breathing right now" counter for the Breathe screen.
// A believable, fully-offline presence number: a smooth daily rhythm (gentle
// morning + evening peaks, a small-hours trough) plus tiny seeded jitter so it
// feels live. Deterministic within a ~4s bucket, so it's stable across renders
// but drifts every few seconds.

const frac = (x: number) => x - Math.floor(x);
const seededNoise = (seed: number) => frac(Math.sin(seed) * 10000);

const BASE_MIN = 900;
const PEAK_ADD = 2200;
const JITTER = 0.06; // ±3%
const BUCKET_MS = 4000;

/** The smooth time-of-day component (no jitter) — exported for testing. */
export const rhythmBase = (now: Date): number => {
  const hour = now.getHours() + now.getMinutes() / 60;
  const morning = Math.exp(-Math.pow(hour - 8, 2) / 6);
  const evening = Math.exp(-Math.pow(hour - 22, 2) / 6);
  return BASE_MIN + (morning + evening) * PEAK_ADD;
};

/** How many minds are "breathing right now". */
export const getBreathingNow = (now: Date = new Date()): number => {
  const base = rhythmBase(now);
  const bucket = Math.floor(now.getTime() / BUCKET_MS);
  const jitter = (seededNoise(bucket) - 0.5) * JITTER;
  return Math.round(base * (1 + jitter));
};
