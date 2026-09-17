// City/village autocomplete backed by OpenStreetMap Nominatim (free, no key —
// the same service the natal chart already geocodes with). Returns a handful of
// populated-place suggestions for a typed query, optionally biased to a country.
// Nominatim asks for a User-Agent and low volume, so callers must debounce.

export interface PlaceSuggestion {
  label: string;   // "Cluj-Napoca, Cluj, Romania"
  city: string;    // best-effort locality name
  country: string; // country name
  lat: number;
  lon: number;
}

const pickCity = (addr: Record<string, string> | undefined, fallback: string): string => {
  if (!addr) return fallback;
  return (
    addr.city || addr.town || addr.village || addr.hamlet ||
    addr.municipality || addr.county || fallback
  );
};

/**
 * Search populated places matching `query`. `countryCode` (ISO alpha-2) narrows
 * results to that country. Returns [] on any error so the UI degrades to plain
 * typing. Pass an AbortSignal to cancel superseded keystrokes.
 */
export const searchPlaces = async (
  query: string,
  countryCode?: string,
  signal?: AbortSignal
): Promise<PlaceSuggestion[]> => {
  const q = query.trim();
  if (q.length < 2) return [];
  try {
    // Build the query manually. React Native/Hermes has an unreliable
    // URLSearchParams, so we encode by hand like services/geocode.ts does.
    const cc = countryCode ? `&countrycodes=${countryCode.toLowerCase()}` : '';
    const url =
      `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1` +
      `&limit=6&accept-language=en&q=${encodeURIComponent(q)}${cc}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Stillnova/1.0 (mindfulness app)', Accept: 'application/json' },
      signal,
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data
      .map((d: any): PlaceSuggestion | null => {
        const lat = parseFloat(d.lat);
        const lon = parseFloat(d.lon);
        if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
        const namePart = String(d.display_name ?? '').split(',')[0].trim();
        const country = d.address?.country ?? '';
        return {
          label: String(d.display_name ?? namePart),
          city: pickCity(d.address, namePart),
          country,
          lat,
          lon,
        };
      })
      .filter((p): p is PlaceSuggestion => p !== null);
  } catch {
    return []; // network error / abort — caller keeps the typed text
  }
};
