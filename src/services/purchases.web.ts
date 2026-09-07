// Web fallback for the RevenueCat wrapper. react-native-purchases is native-only,
// so on the web the app relies on the testing bypass / free tier and this is inert.
export const ENTITLEMENT_ID = 'premium';

// Minimal stand-in for the native PurchasesPackage type (web never has real ones).
export interface PurchasesPackage {
  identifier: string;
  product: { priceString: string; title: string; description: string };
}

export const purchasesAvailable = (): boolean => false;
export const configurePurchases = async (): Promise<void> => {};
export const getCachedPremium = (): boolean => false;
export const refreshPremium = async (): Promise<boolean> => false;
export const getPremiumPackages = async (): Promise<PurchasesPackage[]> => [];
export const purchase = async (_pkg: PurchasesPackage): Promise<boolean> => false;
export const restore = async (): Promise<boolean> => false;
