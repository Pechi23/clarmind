import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

// RN's KeyboardAvoidingView does not react correctly under Android edge-to-edge
// (Expo SDK 54), so we track the keyboard height ourselves and let screens add
// it as bottom padding to lift inputs above the keyboard.
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (e) => setHeight(e.endCoordinates?.height ?? 0));
    const hide = Keyboard.addListener(hideEvt, () => setHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  return height;
}
