// Helpers that map content constants (which carry stable ids) to localized text.
import { ZodiacInfo } from './zodiac';
import { Language, TFunc } from '../i18n';

/** Zodiac display name: Romanian uses the native name, English the Latin name. */
export const signName = (sign: ZodiacInfo, language: Language): string =>
  language === 'ro' ? sign.romanian : sign.name;

export const elementName = (element: string, t: TFunc): string =>
  t(`elements.${element}`);

export const patternName = (id: string, t: TFunc): string => t(`patterns.${id}.name`);
export const patternDesc = (id: string, t: TFunc): string => t(`patterns.${id}.description`);
export const soundscapeName = (id: string, t: TFunc): string => t(`soundscapes.${id}`);
export const challengeText = (id: string, t: TFunc): string => t(`challenges.${id}`);
export const achievementName = (id: string, t: TFunc): string => t(`achievements.${id}.name`);
export const achievementDesc = (id: string, t: TFunc): string => t(`achievements.${id}.description`);
