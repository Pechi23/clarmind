// Freemium entitlements + AI usage quota.
//
// Free: 5 Clara messages/day, numerology + birth chart locked.
// Premium ($5/mo): ~50 AI requests/day (Claude-style quota), everything unlocked.
// Testing bypass: EXPO_PUBLIC_PREMIUM_BYPASS=1 or the in-app override toggle
// unlocks everything so we can test without payments.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCachedPremium } from './purchases';
import { isPaidVariant } from '../constants/appVariant';

export const FREE_DAILY_LIMIT = 5;   // free Clara messages / AI requests per day
export const PAID_DAILY_LIMIT = 50;  // premium AI requests per day

const OVERRIDE_KEY = 'clarmind_premium_override';
const usageKey = (date: string) => `clarmind_ai_usage_${date}`;
const today = () => new Date().toISOString().split('T')[0];

const bypassEnabled = () => process.env.EXPO_PUBLIC_PREMIUM_BYPASS === '1';

export const getPremiumOverride = async (): Promise<boolean> =>
  (await AsyncStorage.getItem(OVERRIDE_KEY)) === 'true';

export const setPremiumOverride = async (on: boolean): Promise<void> => {
  await AsyncStorage.setItem(OVERRIDE_KEY, String(on));
};

/**
 * True when the user has premium access: the paid app variant (everything unlocked),
 * a real RevenueCat subscription (the "premium" entitlement), the build-time bypass,
 * or the in-app testing override.
 */
export const isPremium = async (): Promise<boolean> =>
  isPaidVariant() || bypassEnabled() || getCachedPremium() || (await getPremiumOverride());

export const getAiUsage = async (): Promise<number> =>
  parseInt((await AsyncStorage.getItem(usageKey(today()))) || '0', 10);

export const recordAiUse = async (): Promise<number> => {
  const n = (await getAiUsage()) + 1;
  await AsyncStorage.setItem(usageKey(today()), String(n));
  return n;
};

export interface UsageInfo {
  premium: boolean;
  used: number;
  limit: number;
  remaining: number;
}

export const getUsageInfo = async (): Promise<UsageInfo> => {
  const premium = await isPremium();
  const used = await getAiUsage();
  const limit = premium ? PAID_DAILY_LIMIT : FREE_DAILY_LIMIT;
  return { premium, used, limit, remaining: Math.max(0, limit - used) };
};

/** Can the user send another AI request right now? */
export const canUseAi = async (): Promise<boolean> => {
  const { remaining } = await getUsageInfo();
  return remaining > 0;
};

/** Premium-only features are locked for free users. */
export const isFeatureLocked = async (
  _feature: 'numerology' | 'birthchart'
): Promise<boolean> => !(await isPremium());
