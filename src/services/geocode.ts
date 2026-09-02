// Geocode a birth place (free text) to coordinates, for the natal chart's
// Ascendant/houses. Uses OpenStreetMap Nominatim (free, no key) and caches the
// result per place string. Nominatim asks for a User-Agent and low volume — fine
// for now; swap for a paid/self-hosted geocoder before large-scale launch.
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
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
      { headers: { 'User-Agent': 'ClarMind/1.0 (mindfulness app)', Accept: 'application/json' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const coords: Coords = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    if (Number.isNaN(coords.lat) || Number.isNaN(coords.lon)) return null;
    await AsyncStorage.setItem(cacheKey(q), JSON.stringify(coords));
    return coords;
  } catch {
    return null;
  }
};
