// City/village autocomplete backed by Photon (photon.komoot.io) — a free,
// keyless geocoder explicitly built for type-ahead search. (OpenStreetMap's own
// Nominatim forbids autocomplete in its usage policy and rate-limits to 1 req/s,
// so it is the wrong backend for on-keystroke search.) Returns a handful of
// populated-place suggestions for a typed query, optionally biased to a country.

export interface PlaceSuggestion {
  label: string;   // "Cluj-Napoca, Cluj, Romania"
  city: string;    // best-effort locality name
  country: string; // country name
  lat: number;
  lon: number;
}

// Photon's public instance localizes names for a small set of languages; anything
// else falls back to English/local names, so map unsupported locales to English.
const photonLang = (lang: string): string =>
  (['de', 'en', 'fr'].includes(lang) ? lang : 'en');

// Photon returns all kinds of features (streets, POIs); keep populated places.
const PLACE_TYPES = new Set([
  'city', 'town', 'village', 'hamlet', 'municipality', 'locality', 'district', 'county',
]);

/**
 * Search populated places matching `query`. `countryCode` (ISO alpha-2) narrows
 * results to that country. `lang` localizes labels where Photon supports it.
 * Returns [] on any error so the UI degrades to plain typing. Pass an AbortSignal
 * to cancel superseded keystrokes.
 */
export const searchPlaces = async (
  query: string,
  countryCode?: string,
  signal?: AbortSignal,
  lang: string = 'en',
): Promise<PlaceSuggestion[]> => {
  const q = query.trim();
  if (q.length < 2) return [];
  try {
    // Encode by hand: Hermes' URLSearchParams is unreliable in React Native.
    const url =
      `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}` +
      `&limit=10&lang=${photonLang(lang)}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal });
    if (!res.ok) return [];
    const data = await res.json();
    const features = Array.isArray(data?.features) ? data.features : [];
    const cc = countryCode ? countryCode.toUpperCase() : undefined;

    const out: PlaceSuggestion[] = [];
    for (const f of features) {
      const p = f?.properties ?? {};
      const coords = f?.geometry?.coordinates;
      if (!Array.isArray(coords) || coords.length < 2) continue;
      const lon = Number(coords[0]);
      const lat = Number(coords[1]);
      if (Number.isNaN(lat) || Number.isNaN(lon)) continue;

      const isPlace = p.osm_key === 'place' || PLACE_TYPES.has(p.type);
      if (!isPlace) continue;
      if (cc && String(p.countrycode ?? '').toUpperCase() !== cc) continue;

      const name = p.name ?? p.city ?? '';
      if (!name) continue;
      const label = [name, p.state, p.country].filter(Boolean).join(', ');
      out.push({ label, city: p.city || name, country: p.country ?? '', lat, lon });
      if (out.length >= 6) break;
    }
    return out;
  } catch {
    return []; // network error / abort — caller keeps the typed text
  }
};
