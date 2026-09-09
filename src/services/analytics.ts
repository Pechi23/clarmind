// Product analytics — a tiny, dependency-free wrapper over PostHog's capture API
// (works on native + web via fetch; the project key is a public client key). It's
// a no-op until EXPO_PUBLIC_POSTHOG_KEY is set, and respects an in-app opt-out so
// we honor the Privacy Policy. Every event is tagged with the app variant so the
// free-vs-paid A/B release can be compared (see constants/appVariant + TODO §P5).
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDeviceId } from './deviceId';
import { getAppVariant } from '../constants/appVariant';

const KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';
const OPT_OUT_KEY = 'clarmind_analytics_opt_out';

let optedOut = false;

/** True when an analytics key is configured (so the opt-out UI is worth showing). */
export const analyticsEnabled = (): boolean => !!KEY;

/** Load the opt-out preference once at app start. */
export const initAnalytics = async (): Promise<void> => {
  try { optedOut = (await AsyncStorage.getItem(OPT_OUT_KEY)) === 'true'; } catch {}
};

export const getAnalyticsOptOut = (): boolean => optedOut;

export const setAnalyticsOptOut = async (v: boolean): Promise<void> => {
  optedOut = v;
  try { await AsyncStorage.setItem(OPT_OUT_KEY, String(v)); } catch {}
};

/** Fire-and-forget an anonymous event. Silently does nothing without a key / when opted out. */
export const capture = async (event: string, properties: Record<string, unknown> = {}): Promise<void> => {
  if (!KEY || optedOut) return;
  try {
    const distinct_id = await getDeviceId();
    await fetch(`${HOST.replace(/\/$/, '')}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: KEY,
        event,
        distinct_id,
        properties: { ...properties, variant: getAppVariant(), platform: Platform.OS, app: 'clarmind' },
        timestamp: new Date().toISOString(),
      }),
    });
  } catch {
    // analytics must never break the app
  }
};
