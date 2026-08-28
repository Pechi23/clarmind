import {
  toggleLayer, setLayerVolume, isLayerActive, activeLayerIds, mixSummary, DEFAULT_LAYER_VOLUME,
} from '../soundscapeMixer';

describe('toggleLayer', () => {
  it('adds a layer at default volume', () => {
    const mix = toggleLayer({}, 'rain');
    expect(mix.rain).toBe(DEFAULT_LAYER_VOLUME);
  });
  it('removes an active layer', () => {
    const mix = toggleLayer({ rain: 0.5 }, 'rain');
    expect(mix.rain).toBeUndefined();
  });
  it('layers multiple soundscapes', () => {
    let mix = toggleLayer({}, 'rain');
    mix = toggleLayer(mix, 'ocean');
    expect(activeLayerIds(mix).sort()).toEqual(['ocean', 'rain']);
  });
  it("'silence' clears the whole mix", () => {
    expect(toggleLayer({ rain: 0.5, ocean: 0.3 }, 'silence')).toEqual({});
  });
  it('does not mutate the input', () => {
    const original = { rain: 0.5 };
    toggleLayer(original, 'ocean');
    expect(original).toEqual({ rain: 0.5 });
  });
});

describe('setLayerVolume', () => {
  it('sets and clamps volume', () => {
    expect(setLayerVolume({ rain: 0.5 }, 'rain', 0.8).rain).toBeCloseTo(0.8);
    expect(setLayerVolume({ rain: 0.5 }, 'rain', 2).rain).toBe(1);
    expect(setLayerVolume({ rain: 0.5 }, 'rain', -1).rain).toBe(0);
  });
  it('ignores an inactive layer', () => {
    expect(setLayerVolume({ rain: 0.5 }, 'ocean', 0.9)).toEqual({ rain: 0.5 });
  });
});

describe('isLayerActive & silence', () => {
  it('reports active layers', () => {
    expect(isLayerActive({ rain: 0.5 }, 'rain')).toBe(true);
    expect(isLayerActive({ rain: 0.5 }, 'ocean')).toBe(false);
  });
  it("'silence' is active only when the mix is empty", () => {
    expect(isLayerActive({}, 'silence')).toBe(true);
    expect(isLayerActive({ rain: 0.5 }, 'silence')).toBe(false);
  });
});

describe('mixSummary', () => {
  it('is "silence" when empty', () => {
    expect(mixSummary({})).toBe('silence');
  });
  it('joins sorted ids', () => {
    expect(mixSummary({ rain: 0.5, ocean: 0.4 })).toBe('ocean+rain');
  });
});
