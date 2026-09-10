import {
  breathFromTaps,
  calibrationScale,
  applyCalibration,
  CALIBRATION_MIN_SCALE,
  CALIBRATION_MAX_SCALE,
  NaturalBreath,
} from '../breathCalibration';
import { BREATHING_PATTERNS } from '../../constants/breathing';

const box = BREATHING_PATTERNS.find((p) => p.id === 'box')!;

describe('breathFromTaps', () => {
  it('returns null without at least one inhale and one exhale', () => {
    expect(breathFromTaps([])).toBeNull();
    expect(breathFromTaps([1000])).toBeNull();
    expect(breathFromTaps([1000, 5000])).toBeNull(); // only one interval
  });

  it('averages alternating inhale/exhale gaps', () => {
    // inhale 4s, exhale 6s, inhale 4s, exhale 6s
    const taps = [0, 4000, 10000, 14000, 20000];
    const nb = breathFromTaps(taps)!;
    expect(nb).not.toBeNull();
    expect(nb.inhale).toBeCloseTo(4, 1);
    expect(nb.exhale).toBeCloseTo(6, 1);
    expect(nb.cycles).toBe(2);
  });

  it('ignores double-taps and long stalls', () => {
    const taps = [0, 100 /* double-tap */, 4000, 10000, 50000 /* stall */];
    const nb = breathFromTaps(taps);
    expect(nb).not.toBeNull();
  });
});

describe('calibrationScale', () => {
  it('is 1 when the user matches the pattern pace', () => {
    // box inhale 4 + exhale 4 = 8s active
    const nb: NaturalBreath = { inhale: 4, exhale: 4, cycles: 3 };
    expect(calibrationScale(box, nb)).toBeCloseTo(1, 2);
  });

  it('slows down for a slower breather and clamps to the max', () => {
    const nb: NaturalBreath = { inhale: 20, exhale: 20, cycles: 3 };
    expect(calibrationScale(box, nb)).toBe(CALIBRATION_MAX_SCALE);
  });

  it('speeds up for a faster breather and clamps to the min', () => {
    const nb: NaturalBreath = { inhale: 1, exhale: 1, cycles: 3 };
    expect(calibrationScale(box, nb)).toBe(CALIBRATION_MIN_SCALE);
  });
});

describe('applyCalibration', () => {
  it('returns the pattern unchanged at scale 1', () => {
    expect(applyCalibration(box, 1)).toBe(box);
  });

  it('scales every phase and recomputes totalCycle, preserving proportions', () => {
    const scaled = applyCalibration(box, 1.5);
    expect(scaled.phases.map((p) => p.duration)).toEqual([6, 6, 6, 6]);
    expect(scaled.totalCycle).toBe(24);
    // proportions preserved: all phases were equal, still equal
    expect(new Set(scaled.phases.map((p) => p.duration)).size).toBe(1);
  });

  it('never produces a phase shorter than 1 second', () => {
    const scaled = applyCalibration(box, CALIBRATION_MIN_SCALE);
    expect(Math.min(...scaled.phases.map((p) => p.duration))).toBeGreaterThanOrEqual(1);
  });

  it('does not mutate the source pattern', () => {
    const before = box.phases.map((p) => p.duration);
    applyCalibration(box, 1.5);
    expect(box.phases.map((p) => p.duration)).toEqual(before);
  });
});
