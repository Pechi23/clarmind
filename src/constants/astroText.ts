// Natal-chart interpretation content (EN/RO; other locales fall back to EN).
// Rather than 120 hand-written planet-in-sign paragraphs, we combine a short
// theme for each planet with a short quality for each sign — readable for every
// combination, and easy to localize.
import { ZodiacSign } from './zodiac';

type EnRo = { en: string; ro: string };
const pick = (t: EnRo, lang: string) => (lang === 'ro' ? t.ro : t.en);

// What each body governs.
const PLANET: Record<string, EnRo> = {
  Sun: { en: 'core identity and vitality', ro: 'identitatea de bază și vitalitatea' },
  Moon: { en: 'emotions, instincts and inner world', ro: 'emoțiile, instinctele și lumea interioară' },
  Mercury: { en: 'mind, thinking and communication', ro: 'mintea, gândirea și comunicarea' },
  Venus: { en: 'love, values and what you find beautiful', ro: 'iubirea, valorile și ce ți se pare frumos' },
  Mars: { en: 'drive, energy and how you take action', ro: 'energia, ambiția și felul în care acționezi' },
  Jupiter: { en: 'growth, luck and where you expand', ro: 'creșterea, norocul și zonele de expansiune' },
  Saturn: { en: 'discipline, limits and lasting structure', ro: 'disciplina, limitele și structura de durată' },
  Uranus: { en: 'originality, freedom and sudden change', ro: 'originalitatea, libertatea și schimbarea bruscă' },
  Neptune: { en: 'dreams, intuition and imagination', ro: 'visele, intuiția și imaginația' },
  Pluto: { en: 'transformation, depth and personal power', ro: 'transformarea, profunzimea și puterea personală' },
};

// The flavor each sign lends.
const SIGN: Record<ZodiacSign, EnRo> = {
  Aries: { en: 'bold, direct and quick to begin', ro: 'îndrăzneț, direct și grăbit să înceapă' },
  Taurus: { en: 'steady, patient and grounded', ro: 'constant, răbdător și cu picioarele pe pământ' },
  Gemini: { en: 'curious, versatile and talkative', ro: 'curios, versatil și comunicativ' },
  Cancer: { en: 'caring, sensitive and protective', ro: 'grijuliu, sensibil și protector' },
  Leo: { en: 'warm, expressive and proud', ro: 'cald, expresiv și mândru' },
  Virgo: { en: 'precise, practical and helpful', ro: 'precis, practic și de ajutor' },
  Libra: { en: 'balanced, fair and relationship-minded', ro: 'echilibrat, corect și orientat spre relații' },
  Scorpio: { en: 'intense, deep and all-or-nothing', ro: 'intens, profund și totul-sau-nimic' },
  Sagittarius: { en: 'adventurous, honest and freedom-loving', ro: 'aventuros, sincer și iubitor de libertate' },
  Capricorn: { en: 'disciplined, ambitious and responsible', ro: 'disciplinat, ambițios și responsabil' },
  Aquarius: { en: 'independent, inventive and future-facing', ro: 'independent, inventiv și orientat spre viitor' },
  Pisces: { en: 'dreamy, compassionate and imaginative', ro: 'visător, plin de compasiune și imaginativ' },
};

const HOUSE: Record<number, EnRo> = {
  1: { en: 'self & first impressions', ro: 'sine & prima impresie' },
  2: { en: 'money, values & security', ro: 'bani, valori & siguranță' },
  3: { en: 'communication & learning', ro: 'comunicare & învățare' },
  4: { en: 'home, family & roots', ro: 'casă, familie & rădăcini' },
  5: { en: 'creativity, romance & play', ro: 'creativitate, romantism & joc' },
  6: { en: 'work, health & routine', ro: 'muncă, sănătate & rutină' },
  7: { en: 'partnerships & relationships', ro: 'parteneriate & relații' },
  8: { en: 'intimacy, change & shared resources', ro: 'intimitate, schimbare & resurse comune' },
  9: { en: 'travel, beliefs & meaning', ro: 'călătorii, credințe & sens' },
  10: { en: 'career, status & purpose', ro: 'carieră, statut & scop' },
  11: { en: 'friends, groups & hopes', ro: 'prieteni, grupuri & speranțe' },
  12: { en: 'the inner life, rest & release', ro: 'viața interioară, odihnă & eliberare' },
};

const ASPECT: Record<string, EnRo> = {
  conjunction: { en: 'blend and intensify each other', ro: 'se contopesc și se intensifică reciproc' },
  sextile: { en: 'support each other with easy opportunities', ro: 'se sprijină cu oportunități ușoare' },
  square: { en: 'create productive tension that pushes you to grow', ro: 'creează o tensiune productivă care te împinge să crești' },
  trine: { en: 'flow together naturally and with ease', ro: 'curg împreună natural și cu ușurință' },
  opposition: { en: 'pull in opposite directions, asking for balance', ro: 'trag în direcții opuse, cerând echilibru' },
};

/** "Sun in Leo — your core identity and vitality is warm, expressive and proud." */
export const interpretPlacement = (planet: string, sign: ZodiacSign, house: number, lang: string): string => {
  const p = PLANET[planet];
  const s = SIGN[sign];
  if (!p || !s) return '';
  const base = lang === 'ro'
    ? `${pick(p, lang)} este ${pick(s, lang)}.`
    : `${cap(pick(p, lang))} is ${pick(s, lang)}.`;
  if (house >= 1 && house <= 12) {
    const h = HOUSE[house];
    return lang === 'ro'
      ? `${base} Se manifestă mai ales în zona: ${pick(h, lang)}.`
      : `${base} It shows up most in: ${pick(h, lang)}.`;
  }
  return base;
};

export const interpretAspect = (aName: string, bName: string, type: string, lang: string): string => {
  const a = ASPECT[type];
  if (!a) return '';
  return `${aName} & ${bName} ${pick(a, lang)}.`;
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
