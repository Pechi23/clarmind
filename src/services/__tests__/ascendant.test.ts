import { ascendantSign } from '../ascendant';
import { ZODIAC_SIGNS } from '../../constants/zodiac';

describe('ascendantSign', () => {
  it('equals the Sun sign around sunrise (06:00)', () => {
    expect(ascendantSign('Leo', 6, 0)).toBe('Leo');
    expect(ascendantSign('Aries', 6, 30)).toBe('Aries'); // still within the first 2h slot
  });

  it('advances ~one sign per two hours', () => {
    // Leo (idx 4) + 4h30 after sunrise -> +2 signs -> Libra
    expect(ascendantSign('Leo', 10, 30)).toBe('Libra');
    // Aries (idx 0) at 12:00 -> +3 signs -> Cancer
    expect(ascendantSign('Aries', 12, 0)).toBe('Cancer');
  });

  it('wraps around the zodiac', () => {
    // Pisces (idx 11) advancing should wrap to early signs
    const s = ascendantSign('Pisces', 22, 0); // +8 signs -> (11+8)%12 = 7 = Scorpio
    expect(s).toBe('Scorpio');
  });

  it('handles times before sunrise (negative offset)', () => {
    const s = ascendantSign('Aries', 2, 0); // offset floor((2-6)/2) = -2 -> (0-2+12)%12 = 10 = Aquarius
    expect(s).toBe('Aquarius');
  });

  it('always returns a valid zodiac sign', () => {
    const names = ZODIAC_SIGNS.map((z) => z.name);
    for (let h = 0; h < 24; h++) {
      for (const sun of names) {
        expect(names).toContain(ascendantSign(sun, h, 0));
      }
    }
  });
});
