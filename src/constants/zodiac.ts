export type ZodiacSign =
  | 'Aries' | 'Taurus' | 'Gemini' | 'Cancer'
  | 'Leo' | 'Virgo' | 'Libra' | 'Scorpio'
  | 'Sagittarius' | 'Capricorn' | 'Aquarius' | 'Pisces';

export interface ZodiacInfo {
  name: ZodiacSign;
  romanian: string;
  emoji: string;
  dateRange: string;
  element: string;
  color: string;
}

export const ZODIAC_SIGNS: ZodiacInfo[] = [
  { name: 'Aries',       romanian: 'Berbec',    emoji: '♈', dateRange: '21 Mar – 19 Apr', element: 'Fire',  color: '#FF6B6B' },
  { name: 'Taurus',      romanian: 'Taur',      emoji: '♉', dateRange: '20 Apr – 20 Mai', element: 'Earth', color: '#6BCB77' },
  { name: 'Gemini',      romanian: 'Gemeni',    emoji: '♊', dateRange: '21 Mai – 20 Iun', element: 'Air',   color: '#FFD93D' },
  { name: 'Cancer',      romanian: 'Rac',       emoji: '♋', dateRange: '21 Iun – 22 Iul', element: 'Water', color: '#74C0FC' },
  { name: 'Leo',         romanian: 'Leu',       emoji: '♌', dateRange: '23 Iul – 22 Aug', element: 'Fire',  color: '#FFA94D' },
  { name: 'Virgo',       romanian: 'Fecioara',  emoji: '♍', dateRange: '23 Aug – 22 Sep', element: 'Earth', color: '#A9E34B' },
  { name: 'Libra',       romanian: 'Balanta',   emoji: '♎', dateRange: '23 Sep – 22 Oct', element: 'Air',   color: '#F783AC' },
  { name: 'Scorpio',     romanian: 'Scorpion',  emoji: '♏', dateRange: '23 Oct – 21 Nov', element: 'Water', color: '#CC5DE8' },
  { name: 'Sagittarius', romanian: 'Sagetator', emoji: '♐', dateRange: '22 Nov – 21 Dec', element: 'Fire',  color: '#FF8787' },
  { name: 'Capricorn',   romanian: 'Capricorn', emoji: '♑', dateRange: '22 Dec – 19 Ian', element: 'Earth', color: '#748FFC' },
  { name: 'Aquarius',    romanian: 'Varsator',  emoji: '♒', dateRange: '20 Ian – 18 Feb', element: 'Air',   color: '#4DABF7' },
  { name: 'Pisces',      romanian: 'Pesti',     emoji: '♓', dateRange: '19 Feb – 20 Mar', element: 'Water', color: '#9775FA' },
];
