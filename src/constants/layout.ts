import { useSafeAreaInsets } from 'react-native-safe-area-context';

// The floating tab bar sits at insets.bottom + 12 and is ~62 tall. Content in
// the tab screens must clear it plus a little breathing room.
export const TAB_BAR_CLEARANCE = 108;

/** Bottom padding a scrollable tab screen needs so its content clears the tab bar. */
export const useContentBottomPadding = (): number => {
  const insets = useSafeAreaInsets();
  return TAB_BAR_CLEARANCE + insets.bottom;
};
