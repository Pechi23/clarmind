// Verifies the web behaviour of showDialog (AUDIT.md P0 #4): react-native-web's
// Alert.alert is a no-op, so on web the helper must fall back to window.alert /
// window.confirm and still fire the right button callback.
jest.mock('react-native', () => ({
  Platform: { OS: 'web' },
  Alert: { alert: jest.fn() },
}));

import { showDialog } from '../dialog';

describe('showDialog on web', () => {
  const original = { alert: (global as any).window?.alert, confirm: (global as any).window?.confirm };
  beforeEach(() => {
    (global as any).window = { alert: jest.fn(), confirm: jest.fn() };
  });
  afterAll(() => {
    if (original.alert) (global as any).window = original;
  });

  it('shows a plain notice and fires the single button', () => {
    const onPress = jest.fn();
    showDialog('Title', 'Body', [{ text: 'OK', onPress }]);
    expect((global as any).window.alert).toHaveBeenCalledWith('Title\n\nBody');
    expect(onPress).toHaveBeenCalled();
  });

  it('confirms and fires the non-cancel button when accepted', () => {
    (global as any).window.confirm = jest.fn(() => true);
    const cancel = jest.fn();
    const ok = jest.fn();
    showDialog('Change?', 'Sure?', [
      { text: 'Cancel', style: 'cancel', onPress: cancel },
      { text: 'Yes', onPress: ok },
    ]);
    expect(ok).toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
  });

  it('fires the cancel button when the confirm is dismissed', () => {
    (global as any).window.confirm = jest.fn(() => false);
    const cancel = jest.fn();
    const ok = jest.fn();
    showDialog('Change?', undefined, [
      { text: 'Cancel', style: 'cancel', onPress: cancel },
      { text: 'Yes', onPress: ok },
    ]);
    expect(cancel).toHaveBeenCalled();
    expect(ok).not.toHaveBeenCalled();
  });
});
