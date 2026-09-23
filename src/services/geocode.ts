// Geocode a birth place (free text) to coordinates, for the natal chart's
// Ascendant/houses. Uses Photon (photon.komoot.io) — free, keyless, and the same
// backend as the city autocomplete — and caches the result per place string so a
// place is only ever looked up once per device.
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Coords { lat: number; lon: number; }

const cacheKey = (place: string) => `clarmind_geo_${place.toLowerCase().trim()}`;

export const geocodePlace = async (place: string): Promise<Coords | null> => {
  const q = place.trim();
  if (!q) return null;

  const cached = await AsyncStorage.getItem(cacheKey(q));
  if (cached) {
    try { return JSON.parse(cached); } catch {}
  }

  try {
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=1`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const coordsArr = data?.features?.[0]?.geometry?.coordinates;
    if (!Array.isArray(coordsArr) || coordsArr.length < 2) return null;
    const coords: Coords = { lat: Number(coordsArr[1]), lon: Number(coordsArr[0]) };
    if (Number.isNaN(coords.lat) || Number.isNaN(coords.lon)) return null;
    await AsyncStorage.setItem(cacheKey(q), JSON.stringify(coords));
    return coords;
  } catch {
    return null;
  }
};
