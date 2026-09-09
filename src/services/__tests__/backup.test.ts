import AsyncStorage from '@react-native-async-storage/async-storage';
import { exportData, importData } from '../backup';

beforeEach(async () => { await AsyncStorage.clear(); });

describe('exportData', () => {
  it('captures only clarmind_ keys as a versioned backup', async () => {
    await AsyncStorage.setItem('clarmind_streak', '7');
    await AsyncStorage.setItem('clarmind_user_profile', '{"name":"George"}');
    await AsyncStorage.setItem('other_app_key', 'ignore me');

    const backup = JSON.parse(await exportData());
    expect(backup.app).toBe('clarmind');
    expect(backup.version).toBe(1);
    expect(backup.data.clarmind_streak).toBe('7');
    expect(backup.data.clarmind_user_profile).toBe('{"name":"George"}');
    expect(backup.data.other_app_key).toBeUndefined();
  });
});

describe('importData', () => {
  it('round-trips: export → wipe → import restores the data', async () => {
    await AsyncStorage.setItem('clarmind_streak', '12');
    await AsyncStorage.setItem('clarmind_mood_entries', '[1,2,3]');
    const backup = await exportData();

    await AsyncStorage.clear();
    const res = await importData(backup);

    expect(res.imported).toBe(2);
    expect(await AsyncStorage.getItem('clarmind_streak')).toBe('12');
    expect(await AsyncStorage.getItem('clarmind_mood_entries')).toBe('[1,2,3]');
  });

  it('replaces (not merges) existing clarmind data', async () => {
    await AsyncStorage.setItem('clarmind_streak', '5');
    const backup = await exportData(); // has streak=5, nothing else

    await AsyncStorage.setItem('clarmind_streak', '99');
    await AsyncStorage.setItem('clarmind_extra', 'stale');
    await importData(backup);

    expect(await AsyncStorage.getItem('clarmind_streak')).toBe('5');
    expect(await AsyncStorage.getItem('clarmind_extra')).toBeNull(); // wiped
  });

  it('ignores non-clarmind keys inside the backup payload', async () => {
    const backup = JSON.stringify({ app: 'clarmind', version: 1, exportedAt: 'x', data: { clarmind_ok: '1', evil_key: 'no' } });
    await importData(backup);
    expect(await AsyncStorage.getItem('clarmind_ok')).toBe('1');
    expect(await AsyncStorage.getItem('evil_key')).toBeNull();
  });

  it('rejects invalid JSON and non-ClarMind backups', async () => {
    await expect(importData('not json')).rejects.toThrow();
    await expect(importData('{"app":"other","data":{}}')).rejects.toThrow();
    await expect(importData('{"app":"clarmind","data":[]}')).rejects.toThrow();
  });
});
