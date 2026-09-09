// Build-time app variant for the free-vs-paid A/B release. Set
// EXPO_PUBLIC_APP_VARIANT=paid to build the paid twin; unset/anything else = free.
//
// - The "paid" build unlocks premium outright (a one-time-purchase / paid app —
//   no subscription needed): see entitlements.isPremium().
// - app.config.js gives the paid build its own name + bundle id so the two are
//   separate store listings.
// - (Later) analytics should tag every event with this variant so the two
//   releases can be compared — see TODO §P5.
export type AppVariant = 'free' | 'paid';

/** Read at call time so tests can flip it and env changes are honored. */
export const getAppVariant = (): AppVariant =>
  process.env.EXPO_PUBLIC_APP_VARIANT === 'paid' ? 'paid' : 'free';

export const isPaidVariant = (): boolean => getAppVariant() === 'paid';
