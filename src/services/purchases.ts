// RevenueCat wrapper (native). The web build resolves purchases.web.ts (no-op),
// since react-native-purchases is a native module that can't run in the browser.
//
// The public SDK key comes from EXPO_PUBLIC_REVENUECAT_KEY (safe to ship — it's a
// public client key). Premium is gated on the "premium" entitlement in RevenueCat.
import Purchases, { CustomerInfo, PurchasesPackage } from 'react-native-purchases';

export const ENTITLEMENT_ID = 'premium';
const KEY = process.env.EXPO_PUBLIC_REVENUECAT_KEY ?? '';

// RevenueCat only permits a `test_` store key in debug builds — in a release
// build its native SDK shows a blocking "Wrong API Key" dialog and force-closes
// the app. So a test key is usable only when __DEV__ is true; in a release build
// we must not configure with it, and premium falls back to the testing bypass.
const isTestKey = KEY.startsWith('test_');
// __DEV__ is injected by Metro (false in release). Guard for the jest/node env
// where it's undefined — there we treat it as dev so tests can use a test key.
const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : true;
const keyUsable = !!KEY && (!isTestKey || isDev);

/** True when a RevenueCat key is configured (i.e. purchases are wired up). */
export const purchasesAvailable = (): boolean => keyUsable;

let configured = false;
let cachedPremium = false;

const hasPremium = (info: CustomerInfo): boolean => !!info.entitlements.active[ENTITLEMENT_ID];

/** Configure the SDK once at app start. Safe to call repeatedly; no-op without a usable key. */
export const configurePurchases = async (): Promise<void> => {
  if (!keyUsable || configured) return;
  try {
    Purchases.configure({ apiKey: KEY });
    configured = true;
    Purchases.addCustomerInfoUpdateListener((info) => {
      cachedPremium = hasPremium(info);
    });
    cachedPremium = hasPremium(await Purchases.getCustomerInfo());
  } catch {
    // Non-fatal: the app still works on the free tier / testing bypass.
  }
};

/** Cached premium state (sync) — populated at configure + kept fresh by the listener. */
export const getCachedPremium = (): boolean => cachedPremium;

/** Force-refresh premium state from RevenueCat. */
export const refreshPremium = async (): Promise<boolean> => {
  if (!configured) return cachedPremium;
  try {
    cachedPremium = hasPremium(await Purchases.getCustomerInfo());
  } catch {}
  return cachedPremium;
};

/** The purchasable packages in the current offering (empty until products exist). */
export const getPremiumPackages = async (): Promise<PurchasesPackage[]> => {
  if (!configured) return [];
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current?.availablePackages ?? [];
  } catch {
    return [];
  }
};

/** Buy a package. Returns true if the user is premium afterward. */
export const purchase = async (pkg: PurchasesPackage): Promise<boolean> => {
  if (!configured) return false;
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    cachedPremium = hasPremium(customerInfo);
    return cachedPremium;
  } catch {
    // Includes user cancellation — caller treats a false as "no change".
    return false;
  }
};

/** Restore prior purchases (for reinstalls / new devices). */
export const restore = async (): Promise<boolean> => {
  if (!configured) return cachedPremium;
  try {
    cachedPremium = hasPremium(await Purchases.restorePurchases());
  } catch {}
  return cachedPremium;
};

export type { PurchasesPackage };
