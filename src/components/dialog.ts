// Cross-platform alert/confirm. react-native-web ships `Alert.alert` as an empty
// no-op, so on the web build every native Alert (language change, reset, warnings,
// permission notes) silently does nothing. This helper maps those calls to the
// browser's window.alert / window.confirm so web users get the same dialogs.
import { Alert, Platform } from 'react-native';

export interface DialogButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

export function showDialog(title: string, message?: string, buttons?: DialogButton[]): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons as any);
    return;
  }

  const body = [title, message].filter(Boolean).join('\n\n');

  // No buttons, or a single OK-style button: a plain notice.
  if (!buttons || buttons.length <= 1) {
    if (typeof window !== 'undefined') window.alert(body);
    buttons?.[0]?.onPress?.();
    return;
  }

  // Two-plus buttons: treat as confirm. The confirm action is the first
  // non-cancel button; the cancel action is the button styled 'cancel'.
  const confirmBtn = buttons.find((b) => b.style !== 'cancel') ?? buttons[buttons.length - 1];
  const cancelBtn = buttons.find((b) => b.style === 'cancel');
  const confirmed = typeof window !== 'undefined' ? window.confirm(body) : false;
  if (confirmed) confirmBtn?.onPress?.();
  else cancelBtn?.onPress?.();
}
