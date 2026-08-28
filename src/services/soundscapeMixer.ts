// Pure state for the soundscape mixer: which layers are active and at what
// volume. No audio I/O here (that lives in soundscape.ts) so it's testable.

export type MixState = Record<string, number>; // soundscape id -> volume 0..1

export const DEFAULT_LAYER_VOLUME = 0.5;

/** Toggle a layer on (at default volume) or off. 'silence' clears the whole mix. */
export const toggleLayer = (mix: MixState, id: string): MixState => {
  if (id === 'silence') return {};
  const next = { ...mix };
  if (id in next) delete next[id];
  else next[id] = DEFAULT_LAYER_VOLUME;
  return next;
};

/** Set a layer's volume (clamped 0..1). Volume 0 keeps the layer present but muted. */
export const setLayerVolume = (mix: MixState, id: string, volume: number): MixState => {
  if (!(id in mix)) return mix;
  return { ...mix, [id]: Math.max(0, Math.min(1, volume)) };
};

export const isLayerActive = (mix: MixState, id: string): boolean =>
  id === 'silence' ? Object.keys(mix).length === 0 : id in mix;

export const activeLayerIds = (mix: MixState): string[] => Object.keys(mix);

/** A short, stable label for what's playing, for storage (e.g. sound-bather check). */
export const mixSummary = (mix: MixState): string => {
  const ids = Object.keys(mix).sort();
  return ids.length === 0 ? 'silence' : ids.join('+');
};
