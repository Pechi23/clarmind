import {
  MEDITATION_VOICES, parseMeditation, buildFallbackMeditation,
} from '../guidedMeditation';

describe('MEDITATION_VOICES', () => {
  it('has calm, distinct voices with sane rate/pitch', () => {
    expect(MEDITATION_VOICES.length).toBeGreaterThanOrEqual(3);
    const ids = MEDITATION_VOICES.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length); // unique
    for (const v of MEDITATION_VOICES) {
      expect(v.rate).toBeGreaterThan(0.5);
      expect(v.rate).toBeLessThan(1); // slower than normal = calm
      expect(v.pitch).toBeGreaterThan(0.5);
      expect(v.pitch).toBeLessThan(1.5);
    }
  });
});

describe('parseMeditation', () => {
  it('parses the {segments:[{say,pause}]} shape', () => {
    const raw = '{"segments":[{"say":"Breathe in.","pause":6},{"say":"Let go.","pause":8}]}';
    const segs = parseMeditation(raw);
    expect(segs).toEqual([
      { text: 'Breathe in.', pauseMs: 6000 },
      { text: 'Let go.', pauseMs: 8000 },
    ]);
  });

  it('strips markdown code fences', () => {
    const raw = '```json\n{"segments":[{"say":"Rest.","pause":5}]}\n```';
    expect(parseMeditation(raw)).toEqual([{ text: 'Rest.', pauseMs: 5000 }]);
  });

  it('accepts a bare array and text/pauseSec aliases', () => {
    const raw = '[{"text":"Soften.","pauseSec":4}]';
    expect(parseMeditation(raw)).toEqual([{ text: 'Soften.', pauseMs: 4000 }]);
  });

  it('clamps out-of-range or missing pauses to 2..14s', () => {
    const raw = '{"segments":[{"say":"a","pause":999},{"say":"b","pause":0},{"say":"c"}]}';
    const segs = parseMeditation(raw);
    expect(segs[0].pauseMs).toBe(14000);
    expect(segs[1].pauseMs).toBe(2000);
    expect(segs[2].pauseMs).toBe(6000); // default when absent
  });

  it('drops empty lines and returns [] on invalid JSON', () => {
    expect(parseMeditation('{"segments":[{"say":"","pause":5}]}')).toEqual([]);
    expect(parseMeditation('not json')).toEqual([]);
  });
});

describe('buildFallbackMeditation', () => {
  it('length scales with the chosen minutes (capped by available lines)', () => {
    const short = buildFallbackMeditation('stress', 3).length;
    const mid = buildFallbackMeditation('stress', 5).length;
    const long = buildFallbackMeditation('stress', 10).length;
    expect(short).toBe(8);
    expect(mid).toBeGreaterThanOrEqual(short);
    expect(long).toBeGreaterThanOrEqual(mid);
    expect(long).toBeLessThanOrEqual(20);
  });

  it('weaves in the goal focus and has no empty lines', () => {
    const segs = buildFallbackMeditation('sleep', 5);
    expect(segs.some((s) => /sleep/i.test(s.text))).toBe(true);
    for (const s of segs) {
      expect(s.text.trim().length).toBeGreaterThan(0);
      expect(s.pauseMs).toBeGreaterThan(0);
    }
  });
});
