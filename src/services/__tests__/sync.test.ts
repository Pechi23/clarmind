import { decideSync } from '../syncLogic';

describe('decideSync', () => {
  it('pushes when the cloud is empty', () => {
    expect(decideSync(null, 0)).toBe('push');
    expect(decideSync(null, 12345)).toBe('push');
  });
  it('restores when the cloud is newer than our last sync', () => {
    expect(decideSync(2000, 1000)).toBe('restore');
  });
  it('pushes when local is newer or equal (we have newer changes)', () => {
    expect(decideSync(1000, 2000)).toBe('push');
    expect(decideSync(1000, 1000)).toBe('push');
  });
  it('restores on a fresh device (never synced) when the cloud has data', () => {
    expect(decideSync(5000, 0)).toBe('restore');
  });
});
