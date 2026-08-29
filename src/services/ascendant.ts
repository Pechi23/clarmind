// Rising sign (ascendant) — approximate, from Sun sign + birth time.
//
// Precise ascendants need birth latitude/longitude + sidereal time. Without a
// geocoding service we use the widely-used quick approximation: the ascendant
// equals the Sun sign around sunrise (~06:00) and advances ~one sign every two
// hours through the day. Good enough as an estimate; flagged as such in the UI.
import { ZODIAC_SIGNS, ZodiacSign } from '../constants/zodiac';

const ORDER: ZodiacSign[] = ZODIAC_SIGNS.map((z) => z.name);

export const ascendantSign = (sunSign: ZodiacSign, hour: number, minute: number): ZodiacSign => {
  const sunIndex = ORDER.indexOf(sunSign);
  if (sunIndex < 0) return sunSign;
  const decimal = Math.max(0, Math.min(24, hour)) + Math.max(0, Math.min(59, minute)) / 60;
  const offset = Math.floor((decimal - 6) / 2); // ~1 sign per 2h from sunrise
  const idx = (((sunIndex + offset) % 12) + 12) % 12;
  return ORDER[idx];
};
