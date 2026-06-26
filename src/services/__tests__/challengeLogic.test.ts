import { pickDailyChallengeDefs, seededShuffleIndices, CHALLENGE_POOL } from '../challengeLogic';

describe('seededShuffleIndices', () => {
  it('returns the requested count of distinct indices', () => {
    const idx = seededShuffleIndices(20260626, CHALLENGE_POOL.length, 3);
    expect(idx).toHaveLength(3);
    expect(new Set(idx).size).toBe(3);
  });

  it('keeps every index in range', () => {
    const idx = seededShuffleIndices(12345, CHALLENGE_POOL.length, 3);
    idx.forEach((i) => {
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(CHALLENGE_POOL.length);
    });
  });

  it('is deterministic for the same seed', () => {
    expect(seededShuffleIndices(777, 9, 3)).toEqual(seededShuffleIndices(777, 9, 3));
  });
});

describe('pickDailyChallengeDefs', () => {
  it('gives the same 3 challenges for the same date', () => {
    const a = pickDailyChallengeDefs('2026-06-26');
    const b = pickDailyChallengeDefs('2026-06-26');
    expect(a).toEqual(b);
    expect(a).toHaveLength(3);
  });

  it('returns 3 distinct challenge ids', () => {
    const ids = pickDailyChallengeDefs('2026-06-26').map((c) => c.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('generally differs across dates', () => {
    // Not guaranteed for every pair, but across a week we expect variety.
    const week = ['2026-06-20', '2026-06-21', '2026-06-22', '2026-06-23', '2026-06-24', '2026-06-25', '2026-06-26'];
    const signatures = new Set(week.map((d) => pickDailyChallengeDefs(d).map((c) => c.id).join(',')));
    expect(signatures.size).toBeGreaterThan(1);
  });

  it('only returns challenges that exist in the pool', () => {
    const poolIds = new Set(CHALLENGE_POOL.map((c) => c.id));
    pickDailyChallengeDefs('2026-01-15').forEach((c) => {
      expect(poolIds.has(c.id)).toBe(true);
    });
  });
});
