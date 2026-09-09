import { getAppVariant, isPaidVariant } from '../appVariant';
import { isPremium } from '../../services/entitlements';

const orig = process.env.EXPO_PUBLIC_APP_VARIANT;
afterEach(() => {
  if (orig === undefined) delete process.env.EXPO_PUBLIC_APP_VARIANT;
  else process.env.EXPO_PUBLIC_APP_VARIANT = orig;
});

describe('getAppVariant', () => {
  it('defaults to free when unset', () => {
    delete process.env.EXPO_PUBLIC_APP_VARIANT;
    expect(getAppVariant()).toBe('free');
    expect(isPaidVariant()).toBe(false);
  });
  it('reads "paid"', () => {
    process.env.EXPO_PUBLIC_APP_VARIANT = 'paid';
    expect(getAppVariant()).toBe('paid');
    expect(isPaidVariant()).toBe(true);
  });
  it('treats anything else as free', () => {
    process.env.EXPO_PUBLIC_APP_VARIANT = 'whatever';
    expect(getAppVariant()).toBe('free');
  });
});

describe('paid variant unlocks premium', () => {
  it('isPremium() is true in the paid build', async () => {
    process.env.EXPO_PUBLIC_APP_VARIANT = 'paid';
    await expect(isPremium()).resolves.toBe(true);
  });
  it('isPremium() is not forced true in the free build (no override)', async () => {
    delete process.env.EXPO_PUBLIC_APP_VARIANT;
    delete process.env.EXPO_PUBLIC_PREMIUM_BYPASS;
    await expect(isPremium()).resolves.toBe(false);
  });
});
