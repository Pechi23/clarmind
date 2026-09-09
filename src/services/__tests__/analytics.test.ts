import {
  analyticsEnabled, capture, getAnalyticsOptOut, setAnalyticsOptOut, initAnalytics,
} from '../analytics';

// No EXPO_PUBLIC_POSTHOG_KEY in the test env → analytics is disabled.
describe('analytics (unconfigured)', () => {
  it('is disabled without a key', () => {
    expect(analyticsEnabled()).toBe(false);
  });

  it('capture is a no-op that never throws', async () => {
    await expect(capture('some_event', { a: 1 })).resolves.toBeUndefined();
  });

  it('opt-out defaults off, persists, and reloads', async () => {
    expect(getAnalyticsOptOut()).toBe(false);
    await setAnalyticsOptOut(true);
    expect(getAnalyticsOptOut()).toBe(true);
    await initAnalytics(); // reloads from storage
    expect(getAnalyticsOptOut()).toBe(true);
    await setAnalyticsOptOut(false); // reset
  });
});
