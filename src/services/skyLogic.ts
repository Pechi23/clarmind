import { MeditationSession } from '../types';

/** Groups unique session dates into runs of consecutive calendar days. */
export const getRuns = (sessions: MeditationSession[]): string[][] => {
  const dates = [...new Set(sessions.map((s) => s.date))].sort();
  const runs: string[][] = [];
  let current: string[] = [];
  for (const d of dates) {
    if (current.length === 0) {
      current = [d];
    } else {
      const prev = new Date(current[current.length - 1] + 'T00:00:00');
      const cur = new Date(d + 'T00:00:00');
      const gap = Math.round((cur.getTime() - prev.getTime()) / 86400000);
      if (gap === 1) current.push(d);
      else { runs.push(current); current = [d]; }
    }
  }
  if (current.length) runs.push(current);
  return runs;
};

/** A constellation forms for every full 7-day run. */
export const countConstellations = (sessions: MeditationSession[]): number =>
  getRuns(sessions).reduce((acc, run) => acc + Math.floor(run.length / 7), 0);
