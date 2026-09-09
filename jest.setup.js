// In-memory AsyncStorage mock so data-layer code can be tested without a device.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Minimal react-native shim so services that read Platform (e.g. analytics) load
// under the ts-jest/node environment (no React Native preset here).
jest.mock('react-native', () => ({
  Platform: { OS: 'test', select: (o) => (o && o.default !== undefined ? o.default : o && o.native) },
}));

// RevenueCat is a native module — shim it so pure-logic tests that transitively
// import services/purchases.ts don't try to load native code under Node.
jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(),
    getCustomerInfo: jest.fn(async () => ({ entitlements: { active: {} } })),
    addCustomerInfoUpdateListener: jest.fn(),
    getOfferings: jest.fn(async () => ({ current: null })),
    purchasePackage: jest.fn(async () => ({ customerInfo: { entitlements: { active: {} } } })),
    restorePurchases: jest.fn(async () => ({ entitlements: { active: {} } })),
  },
}));
