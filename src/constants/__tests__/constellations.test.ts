import { CONSTELLATIONS } from '../constellations';
import { ZODIAC_SIGNS } from '../zodiac';

describe('CONSTELLATIONS', () => {
  it('defines a shape for all 12 zodiac signs', () => {
    ZODIAC_SIGNS.forEach((z) => {
      expect(CONSTELLATIONS[z.name]).toBeDefined();
    });
  });

  it('every shape has at least 3 points and 1 edge', () => {
    Object.values(CONSTELLATIONS).forEach((shape) => {
      expect(shape.points.length).toBeGreaterThanOrEqual(3);
      expect(shape.edges.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('every edge references valid point indices', () => {
    Object.entries(CONSTELLATIONS).forEach(([sign, shape]) => {
      shape.edges.forEach(([a, b]) => {
        expect(a).toBeGreaterThanOrEqual(0);
        expect(b).toBeGreaterThanOrEqual(0);
        expect(a).toBeLessThan(shape.points.length);
        expect(b).toBeLessThan(shape.points.length);
        expect(a).not.toBe(b); // no self-loops
      });
    });
  });

  it('keeps every point inside the normalized 0-1 unit box', () => {
    Object.values(CONSTELLATIONS).forEach((shape) => {
      shape.points.forEach(([x, y]) => {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(1);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(1);
      });
    });
  });

  it('connects every point into the figure (no orphan stars)', () => {
    Object.entries(CONSTELLATIONS).forEach(([sign, shape]) => {
      const connected = new Set<number>();
      shape.edges.forEach(([a, b]) => { connected.add(a); connected.add(b); });
      expect(connected.size).toBe(shape.points.length);
    });
  });
});
