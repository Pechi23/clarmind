/**
 * Destiny Matrix (Matrița Destinului) — the 8-point octagram + center computed
 * from the birth date, using the 22 Major Arcana (values 1–22).
 *
 * Method (documented): the octagram is two overlapping squares.
 *   A (left)   = day
 *   B (top)    = month
 *   C (right)  = sum of the year's digits
 *   D (bottom) = A + B + C           (purpose / "comet")
 *   E (center) = A + B + C + D        (comfort zone / core energy — most important)
 * Diagonal (secondary square) corners:
 *   AB (top-left) = A + B
 *   BC (top-right) = B + C
 *   CD (bottom-right) = C + D
 *   DA (bottom-left) = D + A
 * Every value is reduced into the 1–22 arcana range.
 *
 * This is an esoteric model provided for reflection/entertainment only.
 */
import { BirthDate } from './numerology';

/** Map any positive integer into the 1–22 arcana range. */
export const reduceArcana = (n: number): number => ((Math.abs(n) - 1) % 22) + 1;

const sumDigits = (n: number): number =>
  String(Math.abs(n)).split('').reduce((a, c) => a + Number(c), 0);

export interface DestinyMatrix {
  day: number;       // A
  month: number;     // B
  year: number;      // C
  purpose: number;   // D
  center: number;    // E
  topLeft: number;   // AB
  topRight: number;  // BC
  bottomRight: number; // CD
  bottomLeft: number;  // DA
  relationships: number; // heart line
  money: number;         // self-realization line
}

export const computeDestinyMatrix = (dob: BirthDate): DestinyMatrix => {
  const A = reduceArcana(dob.day);
  const B = reduceArcana(dob.month);
  const C = reduceArcana(sumDigits(dob.year));
  const D = reduceArcana(A + B + C);
  const E = reduceArcana(A + B + C + D);
  return {
    day: A,
    month: B,
    year: C,
    purpose: D,
    center: E,
    topLeft: reduceArcana(A + B),
    topRight: reduceArcana(B + C),
    bottomRight: reduceArcana(C + D),
    bottomLeft: reduceArcana(D + A),
    // Extra life-lines (documented as blends of core points):
    relationships: reduceArcana(E + D), // heart — core energy blended with purpose
    money: reduceArcana(E + C),         // self-realization — core blended with social/year
  };
};

// ---- Chakra (energy) map ----------------------------------------------------
// A simplified, reproducible interpretation of the Matrix "health/energy map".
// Each of the 7 chakras gets a Physical and an Emotional source value from key
// matrix points; Energy is their blend. Offered for reflection only.

export type ChakraKey =
  | 'sahasrara' | 'ajna' | 'vishuddha' | 'anahata' | 'manipura' | 'svadhisthana' | 'muladhara';

export const CHAKRAS: { key: ChakraKey; color: string; en: { name: string; theme: string }; ro: { name: string; theme: string } }[] = [
  { key: 'sahasrara',   color: '#a78bfa', en: { name: 'Sahasrara', theme: 'Mission' },       ro: { name: 'Sahasrara', theme: 'Misiune' } },
  { key: 'ajna',        color: '#7c3aed', en: { name: 'Ajna', theme: 'Destiny' },            ro: { name: 'Ajna', theme: 'Destin' } },
  { key: 'vishuddha',   color: '#7dd3fc', en: { name: 'Vishuddha', theme: 'Fate & words' },  ro: { name: 'Vishuddha', theme: 'Soartă & cuvânt' } },
  { key: 'anahata',     color: '#6BCB77', en: { name: 'Anahata', theme: 'Relationships' },   ro: { name: 'Anahata', theme: 'Relații' } },
  { key: 'manipura',    color: '#FFD93D', en: { name: 'Manipura', theme: 'Status' },         ro: { name: 'Manipura', theme: 'Statut' } },
  { key: 'svadhisthana',color: '#FF8787', en: { name: 'Svadhisthana', theme: 'Family & joy' },ro: { name: 'Svadhisthana', theme: 'Familie & bucurie' } },
  { key: 'muladhara',   color: '#CC5DE8', en: { name: 'Muladhara', theme: 'Body & roots' },  ro: { name: 'Muladhara', theme: 'Corp & rădăcini' } },
];

export interface ChakraRow {
  key: ChakraKey;
  physical: number;
  energy: number;
  emotional: number;
}

export const computeChakras = (m: DestinyMatrix): ChakraRow[] => {
  // Physical (material) line and Emotional (spiritual) line, top→bottom.
  const phys = [m.month, m.topLeft, m.day, m.center, m.bottomLeft, m.purpose, m.center];
  const emo = [m.month, m.topRight, m.year, m.center, m.bottomRight, m.purpose, m.center];
  return CHAKRAS.map((c, i) => ({
    key: c.key,
    physical: phys[i],
    emotional: emo[i],
    energy: reduceArcana(phys[i] + emo[i]),
  }));
};

/** Column totals (physical, energy, emotional) — a quick overall picture. */
export const chakraTotals = (rows: ChakraRow[]) => ({
  physical: rows.reduce((a, r) => a + r.physical, 0),
  energy: rows.reduce((a, r) => a + r.energy, 0),
  emotional: rows.reduce((a, r) => a + r.emotional, 0),
});

/** The 22 Major Arcana names, indexed 1–22 (English + Romanian). */
export const ARCANA_NAMES: Record<number, { en: string; ro: string }> = {
  1: { en: 'The Magician', ro: 'Magicianul' },
  2: { en: 'The High Priestess', ro: 'Marea Preoteasă' },
  3: { en: 'The Empress', ro: 'Împărăteasa' },
  4: { en: 'The Emperor', ro: 'Împăratul' },
  5: { en: 'The Hierophant', ro: 'Hierofantul' },
  6: { en: 'The Lovers', ro: 'Îndrăgostiții' },
  7: { en: 'The Chariot', ro: 'Carul' },
  8: { en: 'Justice', ro: 'Dreptatea' },
  9: { en: 'The Hermit', ro: 'Sihastrul' },
  10: { en: 'Wheel of Fortune', ro: 'Roata Norocului' },
  11: { en: 'Strength', ro: 'Puterea' },
  12: { en: 'The Hanged Man', ro: 'Spânzuratul' },
  13: { en: 'Death', ro: 'Moartea' },
  14: { en: 'Temperance', ro: 'Cumpătarea' },
  15: { en: 'The Devil', ro: 'Diavolul' },
  16: { en: 'The Tower', ro: 'Turnul' },
  17: { en: 'The Star', ro: 'Steaua' },
  18: { en: 'The Moon', ro: 'Luna' },
  19: { en: 'The Sun', ro: 'Soarele' },
  20: { en: 'Judgement', ro: 'Judecata' },
  21: { en: 'The World', ro: 'Lumea' },
  22: { en: 'The Fool', ro: 'Nebunul' },
};

export const arcanaName = (n: number, language: 'en' | 'ro'): string =>
  ARCANA_NAMES[n]?.[language] ?? String(n);

/** One-line energy of each arcana (1–22), for the interactive detail view. */
export const ARCANA_MEANINGS: Record<number, { en: string; ro: string }> = {
  1: { en: 'Willpower, initiative and the power to manifest your ideas.', ro: 'Voință, inițiativă și puterea de a-ți manifesta ideile.' },
  2: { en: 'Intuition, inner wisdom and quiet, patient knowing.', ro: 'Intuiție, înțelepciune interioară și cunoaștere răbdătoare.' },
  3: { en: 'Creativity, abundance and a nurturing, warm heart.', ro: 'Creativitate, abundență și o inimă caldă, grijulie.' },
  4: { en: 'Structure, discipline and steady, grounded authority.', ro: 'Structură, disciplină și o autoritate stabilă, ancorată.' },
  5: { en: 'Tradition, learning and spiritual guidance.', ro: 'Tradiție, învățare și îndrumare spirituală.' },
  6: { en: 'Love, meaningful choices and harmony in relationships.', ro: 'Iubire, alegeri importante și armonie în relații.' },
  7: { en: 'Drive and victory that come through focus and will.', ro: 'Determinare și victorie prin focus și voință.' },
  8: { en: 'Balance, fairness and the law of cause and effect.', ro: 'Echilibru, corectitudine și legea cauzei și efectului.' },
  9: { en: 'Introspection, solitude and deep inner guidance.', ro: 'Introspecție, singurătate și ghidare interioară profundă.' },
  10: { en: 'Cycles, destiny and the turning of fortune.', ro: 'Cicluri, destin și rotirea norocului.' },
  11: { en: 'Courage, inner strength and gentle patience.', ro: 'Curaj, forță interioară și răbdare blândă.' },
  12: { en: 'Surrender, a new perspective and the power of pause.', ro: 'Abandon, o perspectivă nouă și puterea pauzei.' },
  13: { en: 'Transformation — endings that make room for rebirth.', ro: 'Transformare — sfârșituri care fac loc renașterii.' },
  14: { en: 'Balance, moderation and gentle healing.', ro: 'Echilibru, moderație și vindecare blândă.' },
  15: { en: 'Attachment and desire — an invitation to shadow work.', ro: 'Atașament și dorință — o invitație la lucrul cu umbra.' },
  16: { en: 'Sudden change that breaks the old and awakens the new.', ro: 'Schimbare bruscă ce dărâmă vechiul și trezește noul.' },
  17: { en: 'Hope, inspiration and serene renewal.', ro: 'Speranță, inspirație și reînnoire senină.' },
  18: { en: 'Intuition, dreams and the depths of the subconscious.', ro: 'Intuiție, vise și adâncurile subconștientului.' },
  19: { en: 'Joy, vitality, success and radiant clarity.', ro: 'Bucurie, vitalitate, succes și claritate strălucitoare.' },
  20: { en: 'Awakening, honest reflection and a sense of calling.', ro: 'Trezire, reflecție sinceră și un sentiment al chemării.' },
  21: { en: 'Completion, wholeness and fulfilled achievement.', ro: 'Împlinire, întregire și realizare desăvârșită.' },
  22: { en: 'Freedom, fresh starts and trusting spontaneity.', ro: 'Libertate, începuturi noi și spontaneitate încrezătoare.' },
};

export const arcanaMeaning = (n: number, language: 'en' | 'ro'): string =>
  ARCANA_MEANINGS[n]?.[language] ?? '';

export type PositionKey = 'center' | 'character' | 'innerTalents' | 'outerTalents' | 'purpose' | 'energyLine';

/** Which life area each matrix point speaks to. */
export const POSITION_META: Record<PositionKey, { en: { title: string; meaning: string }; ro: { title: string; meaning: string } }> = {
  center: {
    en: { title: 'Core Energy', meaning: 'Your essence — the central energy that shapes who you truly are.' },
    ro: { title: 'Energia Esențială', meaning: 'Esența ta — energia centrală care modelează cine ești cu adevărat.' },
  },
  character: {
    en: { title: 'Character', meaning: 'How you meet the world and express your personality day to day.' },
    ro: { title: 'Caracter', meaning: 'Cum întâmpini lumea și îți exprimi personalitatea zi de zi.' },
  },
  innerTalents: {
    en: { title: 'Inner Talents', meaning: 'Gifts and influences that shape your inner world.' },
    ro: { title: 'Talente Interioare', meaning: 'Daruri și influențe care îți modelează lumea interioară.' },
  },
  outerTalents: {
    en: { title: 'Outer Talents', meaning: 'How your gifts show up socially and out in the world.' },
    ro: { title: 'Talente Exterioare', meaning: 'Cum se manifestă darurile tale social și în lume.' },
  },
  purpose: {
    en: { title: 'Life Purpose', meaning: 'The lesson and direction you are here to grow toward.' },
    ro: { title: 'Scopul Vieții', meaning: 'Lecția și direcția spre care ești aici să crești.' },
  },
  energyLine: {
    en: { title: 'Energy Line', meaning: 'A bridge between two forces in your chart, blending their influences.' },
    ro: { title: 'Linie de Energie', meaning: 'O punte între două forțe din matriță, îmbinând influențele lor.' },
  },
};

export const positionInfo = (key: PositionKey, language: 'en' | 'ro') => POSITION_META[key][language];
