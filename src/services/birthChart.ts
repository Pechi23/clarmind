// Natal (birth) chart engine.
//
// Computes geocentric ecliptic longitudes for the Sun, Moon and planets using
// Paul Schlyter's compact orbital-element method ("How to compute planetary
// positions"), the Ascendant + Midheaven from birth time + location, and the
// major aspects between bodies. Accuracy is ~a fraction of a degree for the
// inner bodies and good enough to place every body in the right sign; it is a
// reflective estimate, not an ephemeris-grade calculation. Houses use the
// Whole-Sign system (simple and robust). See NatalChartScreen for the UI.
import { ZODIAC_SIGNS, ZodiacSign } from '../constants/zodiac';
import { parseDob } from './numerology';

const ORDER: ZodiacSign[] = ZODIAC_SIGNS.map((z) => z.name);
const rev = (x: number) => ((x % 360) + 360) % 360;
const sind = (d: number) => Math.sin((d * Math.PI) / 180);
const cosd = (d: number) => Math.cos((d * Math.PI) / 180);
const tand = (d: number) => Math.tan((d * Math.PI) / 180);
const atan2d = (y: number, x: number) => (Math.atan2(y, x) * 180) / Math.PI;
const asind = (x: number) => (Math.asin(x) * 180) / Math.PI;

export const signFromLongitude = (lon: number): ZodiacSign => ORDER[Math.floor(rev(lon) / 30)];

/** Day number from the J2000 epoch (Schlyter), including UT fraction. */
export const dayNumber = (dob: string, hour: number, minute: number): number => {
  const { year: Y, month: M, day: D } = parseDob(dob);
  const UT = Math.max(0, Math.min(23, hour)) + Math.max(0, Math.min(59, minute)) / 60;
  return (
    367 * Y -
    Math.floor((7 * (Y + Math.floor((M + 9) / 12))) / 4) +
    Math.floor((275 * M) / 9) +
    D -
    730530 +
    UT / 24
  );
};

const obliquity = (d: number) => 23.4393 - 3.563e-7 * d;

// Eccentric anomaly by iteration (good for all e < ~0.3).
const eccentricAnomaly = (M: number, e: number) => {
  let E = M + (180 / Math.PI) * e * sind(M) * (1 + e * cosd(M));
  for (let i = 0; i < 8; i++) {
    E = E - (E - (180 / Math.PI) * e * sind(E) - M) / (1 - e * cosd(E));
  }
  return E;
};

// --- Sun -------------------------------------------------------------------
// Returns { lon, xs, ys, r } — geocentric ecliptic longitude + rectangular coords.
const sun = (d: number) => {
  const w = 282.9404 + 4.70935e-5 * d;
  const e = 0.016709 - 1.151e-9 * d;
  const M = rev(356.047 + 0.9856002585 * d);
  const E = eccentricAnomaly(M, e);
  const xv = cosd(E) - e;
  const yv = Math.sqrt(1 - e * e) * sind(E);
  const v = atan2d(yv, xv);
  const r = Math.sqrt(xv * xv + yv * yv);
  const lon = rev(v + w);
  return { lon, xs: r * cosd(lon), ys: r * sind(lon), r, M };
};

export const sunLongitude = (d: number) => sun(d).lon;

// --- Moon ------------------------------------------------------------------
export const moonLongitude = (dob: string, hour: number, minute: number): number => {
  const d = dayNumber(dob, hour, minute);
  const N = rev(125.1228 - 0.0529538083 * d);
  const i = 5.1454;
  const w = rev(318.0634 + 0.1643573223 * d);
  const a = 60.2666;
  const e = 0.0549;
  const Mm = rev(115.3654 + 13.0649929509 * d);
  const E = eccentricAnomaly(Mm, e);
  const xv = a * (cosd(E) - e);
  const yv = a * (Math.sqrt(1 - e * e) * sind(E));
  const v = rev(atan2d(yv, xv));
  const r = Math.sqrt(xv * xv + yv * yv);
  const xh = r * (cosd(N) * cosd(v + w) - sind(N) * sind(v + w) * cosd(i));
  const yh = r * (sind(N) * cosd(v + w) + cosd(N) * sind(v + w) * cosd(i));
  let lon = rev(atan2d(yh, xh));
  // Perturbations from the Sun.
  const Ms = rev(356.047 + 0.9856002585 * d);
  const ws = 282.9404 + 4.70935e-5 * d;
  const Ls = rev(ws + Ms);
  const Lm = rev(N + w + Mm);
  const Dm = rev(Lm - Ls);
  const F = rev(Lm - N);
  lon += -1.274 * sind(Mm - 2 * Dm) + 0.658 * sind(2 * Dm) - 0.186 * sind(Ms)
    - 0.059 * sind(2 * Mm - 2 * Dm) - 0.057 * sind(Mm - 2 * Dm + Ms)
    + 0.053 * sind(Mm + 2 * Dm) + 0.046 * sind(2 * Dm - Ms) + 0.041 * sind(Mm - Ms)
    - 0.035 * sind(Dm) - 0.031 * sind(Mm + Ms) - 0.015 * sind(2 * F - 2 * Dm)
    + 0.011 * sind(Mm - 4 * Dm);
  return rev(lon);
};

export const moonSign = (dob: string, hour: number, minute: number): ZodiacSign =>
  signFromLongitude(moonLongitude(dob, hour, minute));

// --- Planets (Mercury..Neptune) --------------------------------------------
interface Elements { N: number; i: number; w: number; a: number; e: number; M: number; }

const ELEMENTS: Record<string, (d: number) => Elements> = {
  Mercury: (d) => ({ N: 48.3313 + 3.24587e-5 * d, i: 7.0047 + 5.0e-8 * d, w: 29.1241 + 1.01444e-5 * d, a: 0.387098, e: 0.205635 + 5.59e-10 * d, M: rev(168.6562 + 4.0923344368 * d) }),
  Venus: (d) => ({ N: 76.6799 + 2.4659e-5 * d, i: 3.3946 + 2.75e-8 * d, w: 54.891 + 1.38374e-5 * d, a: 0.72333, e: 0.006773 - 1.302e-9 * d, M: rev(48.0052 + 1.6021302244 * d) }),
  Mars: (d) => ({ N: 49.5574 + 2.11081e-5 * d, i: 1.8497 - 1.78e-8 * d, w: 286.5016 + 2.92961e-5 * d, a: 1.523688, e: 0.093405 + 2.516e-9 * d, M: rev(18.6021 + 0.5240207766 * d) }),
  Jupiter: (d) => ({ N: 100.4542 + 2.76854e-5 * d, i: 1.303 - 1.557e-7 * d, w: 273.8777 + 1.64505e-5 * d, a: 5.20256, e: 0.048498 + 4.469e-9 * d, M: rev(19.895 + 0.0830853001 * d) }),
  Saturn: (d) => ({ N: 113.6634 + 2.3898e-5 * d, i: 2.4886 - 1.081e-7 * d, w: 339.3939 + 2.97661e-5 * d, a: 9.55475, e: 0.055546 - 9.499e-9 * d, M: rev(316.967 + 0.0334442282 * d) }),
  Uranus: (d) => ({ N: 74.0005 + 1.3978e-5 * d, i: 0.7733 + 1.9e-8 * d, w: 96.6612 + 3.0565e-5 * d, a: 19.18171 - 1.55e-8 * d, e: 0.047318 + 7.45e-9 * d, M: rev(142.5905 + 0.011725806 * d) }),
  Neptune: (d) => ({ N: 131.7806 + 3.0173e-5 * d, i: 1.77 - 2.55e-7 * d, w: 272.8461 - 6.027e-6 * d, a: 30.05826 + 3.313e-8 * d, e: 0.008606 + 2.15e-9 * d, M: rev(260.2471 + 0.005995147 * d) }),
};

// Heliocentric ecliptic (lon, lat, r) for a planet.
const helio = (el: Elements) => {
  const E = eccentricAnomaly(el.M, el.e);
  const xv = el.a * (cosd(E) - el.e);
  const yv = el.a * Math.sqrt(1 - el.e * el.e) * sind(E);
  const v = rev(atan2d(yv, xv));
  const r = Math.sqrt(xv * xv + yv * yv);
  const xh = r * (cosd(el.N) * cosd(v + el.w) - sind(el.N) * sind(v + el.w) * cosd(el.i));
  const yh = r * (sind(el.N) * cosd(v + el.w) + cosd(el.N) * sind(v + el.w) * cosd(el.i));
  const zh = r * (sind(v + el.w) * sind(el.i));
  return { lon: rev(atan2d(yh, xh)), lat: atan2d(zh, Math.sqrt(xh * xh + yh * yh)), r };
};

// Main mutual perturbations (deg) applied to heliocentric longitude.
const perturbLon = (name: string, d: number): number => {
  const Mj = rev(19.895 + 0.0830853001 * d);
  const Ms = rev(316.967 + 0.0334442282 * d);
  const Mu = rev(142.5905 + 0.011725806 * d);
  if (name === 'Jupiter') {
    return -0.332 * sind(2 * Mj - 5 * Ms - 67.6) - 0.056 * sind(2 * Mj - 2 * Ms + 21)
      + 0.042 * sind(3 * Mj - 5 * Ms + 21) - 0.036 * sind(Mj - 2 * Ms)
      + 0.022 * cosd(Mj - Ms) + 0.023 * sind(2 * Mj - 3 * Ms + 52) - 0.016 * sind(Mj - 5 * Ms - 69);
  }
  if (name === 'Saturn') {
    return 0.812 * sind(2 * Mj - 5 * Ms - 67.6) - 0.229 * cosd(2 * Mj - 4 * Ms - 2)
      + 0.119 * sind(Mj - 2 * Ms - 3) + 0.046 * sind(2 * Mj - 6 * Ms - 69) + 0.014 * sind(Mj - 3 * Ms + 32);
  }
  if (name === 'Uranus') {
    return 0.04 * sind(Ms - 2 * Mu + 6) + 0.035 * sind(Ms - 3 * Mu + 33) - 0.015 * sind(Mj - Mu + 20);
  }
  return 0;
};

// Pluto (Schlyter series, valid ~1800-2100).
const plutoHelio = (d: number) => {
  const S = 50.03 + 0.033459652 * d;
  const P = 238.95 + 0.003968789 * d;
  const lon = 238.9508 + 0.00400703 * d
    - 19.799 * sind(P) + 19.848 * cosd(P) + 0.897 * sind(2 * P) - 4.956 * cosd(2 * P)
    + 0.61 * sind(3 * P) + 1.211 * cosd(3 * P) - 0.341 * sind(4 * P) - 0.19 * cosd(4 * P)
    + 0.128 * sind(5 * P) - 0.034 * cosd(5 * P) - 0.038 * sind(6 * P) + 0.031 * cosd(6 * P)
    + 0.02 * sind(S - P) - 0.01 * cosd(S - P);
  const lat = -3.9082 - 5.453 * sind(P) - 14.975 * cosd(P) + 3.527 * sind(2 * P) + 1.673 * cosd(2 * P)
    - 1.051 * sind(3 * P) + 0.984 * cosd(3 * P) + 0.179 * sind(4 * P) - 0.292 * cosd(4 * P)
    + 0.019 * sind(5 * P) + 0.005 * cosd(5 * P) - 0.017 * sind(6 * P) + 0.003 * cosd(6 * P);
  const r = 40.72 + 6.68 * sind(P) + 6.9 * cosd(P) - 1.18 * sind(2 * P) - 0.03 * cosd(2 * P)
    + 0.15 * sind(3 * P) - 0.14 * cosd(3 * P);
  return { lon: rev(lon), lat, r };
};

// Geocentric ecliptic longitude of a planet.
const planetGeoLon = (name: string, d: number): number => {
  const s = sun(d);
  let h: { lon: number; lat: number; r: number };
  if (name === 'Pluto') h = plutoHelio(d);
  else h = helio(ELEMENTS[name](d));
  const lon = rev(h.lon + perturbLon(name, d));
  // rectangular heliocentric -> geocentric (add Sun's geocentric rectangular)
  const xh = h.r * cosd(lon) * cosd(h.lat);
  const yh = h.r * sind(lon) * cosd(h.lat);
  const xg = xh + s.xs;
  const yg = yh + s.ys;
  return rev(atan2d(yg, xg));
};

// --- Ascendant / Midheaven -------------------------------------------------
// Local sidereal time (deg) from day number + east longitude.
const localSiderealDeg = (d: number, lonEast: number): number => {
  const s = sun(d);
  const ws = 282.9404 + 4.70935e-5 * d;
  const Ls = rev(ws + s.M); // Sun mean longitude
  const gmst0 = rev(Ls + 180); // GMST at 0h expressed via Sun's mean longitude
  const UT = ((d % 1) + 1) % 1; // fractional day = UT/24
  return rev(gmst0 + UT * 360 + lonEast);
};

export const ascendantMc = (d: number, latDeg: number, lonEastDeg: number) => {
  const ecl = obliquity(d);
  const ramc = localSiderealDeg(d, lonEastDeg);
  // Midheaven
  let mc = rev(atan2d(sind(ramc), cosd(ramc) * cosd(ecl)));
  // Ascendant
  let asc = rev(atan2d(cosd(ramc), -(sind(ramc) * cosd(ecl) + tand(latDeg) * sind(ecl))));
  // Ascendant must be within ~90-270 of the MC (the eastern horizon point).
  if (rev(asc - mc) < 180) asc = rev(asc + 180);
  return { asc, mc };
};

// --- Aspects ---------------------------------------------------------------
export interface Aspect { a: string; b: string; type: string; angle: number; orb: number; }
const ASPECTS = [
  { type: 'conjunction', angle: 0, orb: 8, glyph: '☌' },
  { type: 'sextile', angle: 60, orb: 5, glyph: '﹡' },
  { type: 'square', angle: 90, orb: 7, glyph: '□' },
  { type: 'trine', angle: 120, orb: 7, glyph: '△' },
  { type: 'opposition', angle: 180, orb: 8, glyph: '☍' },
];
export const aspectGlyph = (type: string) => ASPECTS.find((a) => a.type === type)?.glyph ?? '';

// --- Full chart ------------------------------------------------------------
export interface Placement { name: string; symbol: string; lon: number; sign: ZodiacSign; deg: number; house: number; retro: boolean; }
export interface NatalChart {
  placements: Placement[];
  ascendant: number | null;
  mc: number | null;
  aspects: Aspect[];
  hasHouses: boolean;
}

const BODIES: { name: string; symbol: string }[] = [
  { name: 'Sun', symbol: '☉' }, { name: 'Moon', symbol: '☾' }, { name: 'Mercury', symbol: '☿' },
  { name: 'Venus', symbol: '♀' }, { name: 'Mars', symbol: '♂' }, { name: 'Jupiter', symbol: '♃' },
  { name: 'Saturn', symbol: '♄' }, { name: 'Uranus', symbol: '♅' }, { name: 'Neptune', symbol: '♆' },
  { name: 'Pluto', symbol: '♇' },
];

const bodyLon = (name: string, dob: string, hour: number, minute: number, d: number): number => {
  if (name === 'Sun') return sunLongitude(d);
  if (name === 'Moon') return moonLongitude(dob, hour, minute);
  return planetGeoLon(name, d);
};

/**
 * Compute the natal chart. Pass birth latitude/longitude (decimal degrees, east
 * positive) to get the Ascendant, Midheaven and Whole-Sign houses; omit them to
 * get planet-in-sign placements only.
 */
export const computeNatalChart = (
  dob: string,
  hour: number,
  minute: number,
  lat?: number,
  lon?: number,
): NatalChart => {
  const d = dayNumber(dob, hour, minute);

  let ascendant: number | null = null;
  let mc: number | null = null;
  let hasHouses = false;
  if (typeof lat === 'number' && typeof lon === 'number') {
    const am = ascendantMc(d, lat, lon);
    ascendant = am.asc;
    mc = am.mc;
    hasHouses = true;
  }
  const ascSignStart = ascendant !== null ? Math.floor(ascendant / 30) * 30 : 0;
  const houseOf = (l: number): number =>
    hasHouses ? (Math.floor(rev(l - ascSignStart) / 30) + 1) : 0;

  const placements: Placement[] = BODIES.map((b) => {
    const l = bodyLon(b.name, dob, hour, minute, d);
    const l2 = b.name === 'Moon'
      ? moonLongitude(dob, hour, minute + 60)
      : bodyLon(b.name, dob, hour + 1, minute, dayNumber(dob, hour + 1, minute));
    const retro = b.name !== 'Sun' && b.name !== 'Moon' && rev(l2 - l) > 180;
    return {
      name: b.name, symbol: b.symbol, lon: l,
      sign: signFromLongitude(l), deg: l % 30, house: houseOf(l), retro,
    };
  });

  // Aspects between bodies.
  const aspects: Aspect[] = [];
  for (let i = 0; i < placements.length; i++) {
    for (let j = i + 1; j < placements.length; j++) {
      let diff = Math.abs(placements[i].lon - placements[j].lon);
      if (diff > 180) diff = 360 - diff;
      for (const asp of ASPECTS) {
        const orb = Math.abs(diff - asp.angle);
        if (orb <= asp.orb) {
          aspects.push({ a: placements[i].name, b: placements[j].name, type: asp.type, angle: asp.angle, orb });
          break;
        }
      }
    }
  }

  return { placements, ascendant, mc, aspects, hasHouses };
};

export { asind };
