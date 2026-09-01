// Birth chart "big three": Sun, Moon and Rising sign.
//
// Sun is exact (from the zodiac date). Rising is the time-based approximation
// from ascendant.ts. Moon is computed here from a compact lunar-position model
// (Paul Schlyter's method, ~1-2° accuracy) — enough to place the Moon in the
// right sign nearly all the time. A full planetary chart (houses + planets)
// needs a proper ephemeris and is tracked as a follow-up.
import { ZODIAC_SIGNS, ZodiacSign } from '../constants/zodiac';
import { parseDob } from './numerology';

const ORDER: ZodiacSign[] = ZODIAC_SIGNS.map((z) => z.name);
const rev = (x: number) => ((x % 360) + 360) % 360;
const sind = (d: number) => Math.sin((d * Math.PI) / 180);
const cosd = (d: number) => Math.cos((d * Math.PI) / 180);
const atan2d = (y: number, x: number) => (Math.atan2(y, x) * 180) / Math.PI;

export const signFromLongitude = (lon: number): ZodiacSign => ORDER[Math.floor(rev(lon) / 30)];

/** Moon's geocentric ecliptic longitude in degrees (Schlyter), ~1-2° accuracy. */
export const moonLongitude = (dob: string, hour: number, minute: number): number => {
  const { year: Y, month: M, day: D } = parseDob(dob);
  const UT = Math.max(0, Math.min(23, hour)) + Math.max(0, Math.min(59, minute)) / 60;
  // Day number from the J2000 epoch (Schlyter).
  const d =
    367 * Y -
    Math.floor((7 * (Y + Math.floor((M + 9) / 12))) / 4) +
    Math.floor((275 * M) / 9) +
    D -
    730530 +
    UT / 24;

  const N = rev(125.1228 - 0.0529538083 * d); // longitude of ascending node
  const i = 5.1454; // inclination
  const w = rev(318.0634 + 0.1643573223 * d); // argument of perigee
  const a = 60.2666; // mean distance (Earth radii)
  const e = 0.0549; // eccentricity
  const Mm = rev(115.3654 + 13.0649929509 * d); // mean anomaly

  // Eccentric anomaly (iterate a few times).
  let E = Mm + (180 / Math.PI) * e * sind(Mm) * (1 + e * cosd(Mm));
  for (let it = 0; it < 6; it++) {
    E = E - (E - (180 / Math.PI) * e * sind(E) - Mm) / (1 - e * cosd(E));
  }

  const xv = a * (cosd(E) - e);
  const yv = a * (Math.sqrt(1 - e * e) * sind(E));
  const v = rev(atan2d(yv, xv));
  const r = Math.sqrt(xv * xv + yv * yv);

  const xh = r * (cosd(N) * cosd(v + w) - sind(N) * sind(v + w) * cosd(i));
  const yh = r * (sind(N) * cosd(v + w) + cosd(N) * sind(v + w) * cosd(i));
  let lon = rev(atan2d(yh, xh));

  // Perturbations from the Sun (main terms).
  const Ms = rev(356.047 + 0.9856002585 * d); // Sun mean anomaly
  const ws = 282.9404 + 4.70935e-5 * d;
  const Ls = rev(ws + Ms); // Sun mean longitude
  const Lm = rev(N + w + Mm); // Moon mean longitude
  const Dm = rev(Lm - Ls); // mean elongation
  const F = rev(Lm - N); // argument of latitude

  lon += -1.274 * sind(Mm - 2 * Dm);
  lon += +0.658 * sind(2 * Dm);
  lon += -0.186 * sind(Ms);
  lon += -0.059 * sind(2 * Mm - 2 * Dm);
  lon += -0.057 * sind(Mm - 2 * Dm + Ms);
  lon += +0.053 * sind(Mm + 2 * Dm);
  lon += +0.046 * sind(2 * Dm - Ms);
  lon += +0.041 * sind(Mm - Ms);
  lon += -0.035 * sind(Dm);
  lon += -0.031 * sind(Mm + Ms);
  lon += -0.015 * sind(2 * F - 2 * Dm);
  lon += +0.011 * sind(Mm - 4 * Dm);

  return rev(lon);
};

export const moonSign = (dob: string, hour: number, minute: number): ZodiacSign =>
  signFromLongitude(moonLongitude(dob, hour, minute));
