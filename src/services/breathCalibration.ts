// Breath calibration — scale a breathing pattern to the user's natural pace.
//
// The user taps along with a few of their own breaths (tap on each inhale, tap
// on each exhale). We measure their average inhale/exhale, compare it to the
// pattern's baseline, and scale every phase proportionally — so a 4-7-8 stays
// 4-7-8-shaped, just slower or faster to match how the user actually breathes.
//
// Pure and fully offline. The persisted result is a single scale multiplier.

import { BreathingPattern, BreathingPhase } from '../constants/breathing';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// Keep calibration gentle: never speed a pattern past ~1.7x or slow it past ~0.6x,
// so a stray tap can't produce a 1-second or a 30-second inhale.
export const CALIBRATION_MIN_SCALE = 0.6;
export const CALIBRATION_MAX_SCALE = 1.7;

export interface NaturalBreath {
  inhale: number; // seconds
  exhale: number; // seconds
  cycles: number; // how many full breaths were measured
}

/**
 * Turn a series of tap timestamps (ms) into an average inhale/exhale.
 * Taps alternate: [inhaleStart, exhaleStart, inhaleStart, exhaleStart, ...].
 * Gap 0→1 is an inhale, 1→2 an exhale, and so on. Returns null if there
 * isn't at least one clean inhale and one clean exhale.
 */
export const breathFromTaps = (taps: number[]): NaturalBreath | null => {
  if (!taps || taps.length < 3) return null;
  const inhales: number[] = [];
  const exhales: number[] = [];
  for (let i = 1; i < taps.length; i++) {
    const dt = (taps[i] - taps[i - 1]) / 1000;
    if (!(dt > 0.4) || dt > 30) continue; // ignore double-taps and long stalls
    if (i % 2 === 1) inhales.push(dt);
    else exhales.push(dt);
  }
  if (!inhales.length || !exhales.length) return null;
  const avg = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
  return {
    inhale: avg(inhales),
    exhale: avg(exhales),
    cycles: Math.min(inhales.length, exhales.length),
  };
};

/** The pattern's baseline inhale (first phase) and exhale (first phase whose scale drops). */
const patternInhaleExhale = (pattern: BreathingPattern): { inhale: number; exhale: number } => {
  const inhale = pattern.phases[0]?.duration ?? 4;
  const exhalePhase = pattern.phases.find((p, i) => i > 0 && p.scale <= 1);
  const exhale = exhalePhase?.duration ?? inhale;
  return { inhale, exhale };
};

/**
 * The multiplier that best matches the pattern's active breath (inhale+exhale)
 * to the user's natural one, clamped to a gentle range.
 */
export const calibrationScale = (pattern: BreathingPattern, natural: NaturalBreath): number => {
  const { inhale, exhale } = patternInhaleExhale(pattern);
  const baseActive = inhale + exhale;
  const userActive = natural.inhale + natural.exhale;
  if (!(baseActive > 0) || !(userActive > 0)) return 1;
  return clamp(userActive / baseActive, CALIBRATION_MIN_SCALE, CALIBRATION_MAX_SCALE);
};

/**
 * Apply a scale multiplier to a pattern, preserving its proportions.
 * Each phase is scaled and rounded to whole seconds (min 1s), and totalCycle
 * is recomputed from the scaled phases. scale===1 returns the pattern unchanged.
 */
export const applyCalibration = (pattern: BreathingPattern, scale: number): BreathingPattern => {
  const s = clamp(scale, CALIBRATION_MIN_SCALE, CALIBRATION_MAX_SCALE);
  if (Math.abs(s - 1) < 0.02) return pattern;
  const phases: BreathingPhase[] = pattern.phases.map((p) => ({
    ...p,
    duration: Math.max(1, Math.round(p.duration * s)),
  }));
  const totalCycle = phases.reduce((sum, p) => sum + p.duration, 0);
  return { ...pattern, phases, totalCycle };
};
