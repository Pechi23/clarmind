import {
  moonSign, signFromLongitude, sunLongitude, dayNumber, computeNatalChart,
} from '../birthChart';
import { ZODIAC_SIGNS } from '../../constants/zodiac';

const names = ZODIAC_SIGNS.map((z) => z.name);

describe('birthChart', () => {
  it('signFromLongitude maps degrees to signs', () => {
    expect(signFromLongitude(0)).toBe('Aries');
    expect(signFromLongitude(125)).toBe('Leo');
    expect(signFromLongitude(210)).toBe('Scorpio');
    expect(signFromLongitude(-15)).toBe('Pisces');
  });

  it('Sun lands in the expected sign for known dates', () => {
    const sunSign = (dob: string) => signFromLongitude(sunLongitude(dayNumber(dob, 12, 0)));
    expect(sunSign('1995-08-01')).toBe('Leo');       // Jul 23 – Aug 22
    expect(sunSign('2000-01-10')).toBe('Capricorn'); // Dec 22 – Jan 19
    expect(sunSign('1990-04-05')).toBe('Aries');     // Mar 21 – Apr 19
    expect(sunSign('1988-11-10')).toBe('Scorpio');   // Oct 23 – Nov 21
  });

  it('moonSign returns a valid sign and shifts over ~2 weeks', () => {
    expect(names).toContain(moonSign('1995-07-15', 14, 0));
    expect(moonSign('2000-01-01', 12, 0)).not.toBe(moonSign('2000-01-14', 12, 0));
  });

  it('computeNatalChart returns all 10 bodies in valid signs', () => {
    const c = computeNatalChart('1990-12-25', 8, 30);
    expect(c.placements).toHaveLength(10);
    for (const p of c.placements) {
      expect(names).toContain(p.sign);
      expect(p.deg).toBeGreaterThanOrEqual(0);
      expect(p.deg).toBeLessThan(30);
    }
    expect(c.hasHouses).toBe(false);
    expect(c.ascendant).toBeNull();
  });

  it('with coordinates it computes Ascendant, MC and houses 1-12', () => {
    const c = computeNatalChart('1990-12-25', 8, 30, 44.43, 26.10); // Bucharest
    expect(c.hasHouses).toBe(true);
    expect(c.ascendant).not.toBeNull();
    expect(c.mc).not.toBeNull();
    for (const p of c.placements) {
      expect(p.house).toBeGreaterThanOrEqual(1);
      expect(p.house).toBeLessThanOrEqual(12);
    }
  });

  it('produces some aspects', () => {
    const c = computeNatalChart('1990-12-25', 8, 30, 44.43, 26.10);
    expect(Array.isArray(c.aspects)).toBe(true);
    for (const a of c.aspects) {
      expect(a.orb).toBeGreaterThanOrEqual(0);
    }
  });
});
