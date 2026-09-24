import AsyncStorage from '@react-native-async-storage/async-storage';
import { exportData, importData, restoreState } from '../backup';
import { pruneOldKeys } from '../storage';
import { localDateKey } from '../streakLogic';

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

  it('cloud restore (trusted) keeps the device id but still drops the premium override', async () => {
    await AsyncStorage.clear();
    await restoreState(
      { clarmind_streak: '4', clarmind_device_id: 'my-account-id', clarmind_premium_override: 'true' },
      { trusted: true },
    );
    expect(await AsyncStorage.getItem('clarmind_device_id')).toBe('my-account-id'); // identity kept
    expect(await AsyncStorage.getItem('clarmind_premium_override')).toBeNull();     // still blocked
  });

  it('never restores premium override or device id from a pasted backup', async () => {
    const backup = JSON.stringify({
      app: 'clarmind', version: 1, exportedAt: 'x',
      data: { clarmind_streak: '3', clarmind_premium_override: 'true', clarmind_device_id: 'stolen' },
    });
    const res = await importData(backup);
    expect(res.imported).toBe(1); // only clarmind_streak
    expect(await AsyncStorage.getItem('clarmind_streak')).toBe('3');
    expect(await AsyncStorage.getItem('clarmind_premium_override')).toBeNull();
    expect(await AsyncStorage.getItem('clarmind_device_id')).toBeNull();
  });

  it('rejects invalid JSON and non-Stillnova backups', async () => {
    await expect(importData('not json')).rejects.toThrow();
    await expect(importData('{"app":"other","data":{}}')).rejects.toThrow();
    await expect(importData('{"app":"clarmind","data":[]}')).rejects.toThrow();
  });
});

describe('pruneOldKeys', () => {
  const dayKey = (offset: number) => localDateKey(new Date(Date.now() - offset * 86400000));

  it('removes date-keyed entries older than a week, keeps recent ones and other keys', async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem(`clarmind_ai_usage_${dayKey(0)}`, '3');   // today
    await AsyncStorage.setItem(`clarmind_ai_usage_${dayKey(10)}`, '5');  // 10 days ago
    await AsyncStorage.setItem(`clarmind_numerology_${dayKey(9)}_es`, '{}'); // 9 days ago
    await AsyncStorage.setItem('clarmind_streak', '12'); // not date-keyed

    const removed = await pruneOldKeys(7);

    expect(removed).toBe(2);
    expect(await AsyncStorage.getItem(`clarmind_ai_usage_${dayKey(0)}`)).toBe('3');
    expect(await AsyncStorage.getItem(`clarmind_ai_usage_${dayKey(10)}`)).toBeNull();
    expect(await AsyncStorage.getItem(`clarmind_numerology_${dayKey(9)}_es`)).toBeNull();
    expect(await AsyncStorage.getItem('clarmind_streak')).toBe('12');
  });
});
