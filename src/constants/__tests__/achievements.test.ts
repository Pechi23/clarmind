import { getLevelForXp, LEVELS, ENLIGHTENED_STEP } from '../achievements';

describe('getLevelForXp', () => {
  it('level 1 at 0 XP', () => {
    expect(getLevelForXp(0).level).toBe(1);
    expect(getLevelForXp(0).rank).toBe('Wandering Mind');
  });

  it('stays level 1 just below the level-2 threshold', () => {
    expect(getLevelForXp(99).level).toBe(1);
  });

  it('hits level 2 exactly at its threshold', () => {
    expect(getLevelForXp(100).level).toBe(2);
    expect(getLevelForXp(100).rank).toBe('Curious Mind');
  });

  it('reports the correct surrounding XP window', () => {
    const info = getLevelForXp(120);
    expect(info.level).toBe(2);
    expect(info.currentLevelXp).toBe(100);
    expect(info.nextLevelXp).toBe(250);
  });

  it('reaches the top named level (12) at its threshold', () => {
    const top = LEVELS[LEVELS.length - 1];
    expect(getLevelForXp(top.totalXp).level).toBe(12);
    expect(getLevelForXp(top.totalXp).rank).toBe('Clear Mind');
  });

  it('enters Enlightened tier beyond the table', () => {
    const top = LEVELS[LEVELS.length - 1];
    const info = getLevelForXp(top.totalXp + ENLIGHTENED_STEP);
    expect(info.level).toBe(13);
    expect(info.rank).toContain('Enlightened');
  });

  it('level only ever increases with XP (monotonic)', () => {
    let prev = 0;
    for (let xp = 0; xp <= 20000; xp += 137) {
      const lvl = getLevelForXp(xp).level;
      expect(lvl).toBeGreaterThanOrEqual(prev);
      prev = lvl;
    }
  });

  it('progress within a level is always between current and next thresholds', () => {
    for (let xp = 0; xp <= 9000; xp += 50) {
      const { currentLevelXp, nextLevelXp } = getLevelForXp(xp);
      expect(xp).toBeGreaterThanOrEqual(currentLevelXp);
      expect(nextLevelXp).toBeGreaterThan(currentLevelXp);
    }
  });
});
