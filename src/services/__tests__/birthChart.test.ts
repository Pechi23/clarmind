import { moonLongitude, moonSign, signFromLongitude } from '../birthChart';
import { ZODIAC_SIGNS } from '../../constants/zodiac';

const names = ZODIAC_SIGNS.map((z) => z.name);

describe('birthChart', () => {
  it('signFromLongitude maps 0/30/210 to Aries/Taurus/Scorpio', () => {
    expect(signFromLongitude(0)).toBe('Aries');
    expect(signFromLongitude(30)).toBe('Taurus');
    expect(signFromLongitude(210)).toBe('Scorpio');
    expect(signFromLongitude(-15)).toBe('Pisces'); // wraps
  });

  it('moonLongitude stays within 0..360', () => {
    const lon = moonLongitude('1990-12-25', 8, 30);
    expect(lon).toBeGreaterThanOrEqual(0);
    expect(lon).toBeLessThan(360);
  });

  it('moonSign returns a valid sign and is deterministic', () => {
    const a = moonSign('1995-07-15', 14, 0);
    const b = moonSign('1995-07-15', 14, 0);
    expect(names).toContain(a);
    expect(a).toBe(b);
  });

  it('the Moon changes sign over ~2 weeks', () => {
    const s1 = moonSign('2000-01-01', 12, 0);
    const s2 = moonSign('2000-01-14', 12, 0);
    expect(s1).not.toBe(s2);
  });
});
