// Verifies searchPlaces parses Photon's GeoJSON, keeps populated places (drops
// streets/POIs), honors the country filter, and builds a readable label.
import { searchPlaces } from '../placeSearch';

const feature = (props: any, lon: number, lat: number) => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [lon, lat] },
  properties: props,
});

const photonResponse = {
  features: [
    feature({ name: 'Cluj-Napoca', type: 'city', osm_key: 'place', countrycode: 'RO', state: 'Cluj', country: 'Romania', city: 'Cluj-Napoca' }, 23.59, 46.77),
    feature({ name: 'Cluj Airport', type: 'house', osm_key: 'aeroway', countrycode: 'RO', country: 'Romania' }, 23.68, 46.78),
    feature({ name: 'Cluj Street', type: 'street', osm_key: 'highway', countrycode: 'RO', country: 'Romania' }, 23.6, 46.77),
    feature({ name: 'Clusone', type: 'town', osm_key: 'place', countrycode: 'IT', state: 'Lombardy', country: 'Italy' }, 9.95, 45.89),
  ],
};

const mockFetchOnce = (json: any, ok = true) => {
  (global as any).fetch = jest.fn().mockResolvedValue({ ok, json: async () => json });
};

describe('searchPlaces (Photon)', () => {
  afterEach(() => { jest.restoreAllMocks(); });

  it('returns [] for short queries without calling the network', async () => {
    (global as any).fetch = jest.fn();
    expect(await searchPlaces('a')).toEqual([]);
    expect((global as any).fetch).not.toHaveBeenCalled();
  });

  it('keeps populated places and drops streets/POIs', async () => {
    mockFetchOnce(photonResponse);
    const res = await searchPlaces('Cluj');
    const names = res.map((r) => r.city);
    expect(names).toContain('Cluj-Napoca');
    expect(names).toContain('Clusone');
    expect(names).not.toContain('Cluj Airport');
    expect(names).not.toContain('Cluj Street');
  });

  it('filters to the requested country', async () => {
    mockFetchOnce(photonResponse);
    const res = await searchPlaces('Cluj', 'RO');
    expect(res.every((r) => r.country === 'Romania')).toBe(true);
    expect(res.find((r) => r.city === 'Clusone')).toBeUndefined();
  });

  it('builds a "name, state, country" label with coordinates', async () => {
    mockFetchOnce(photonResponse);
    const [first] = await searchPlaces('Cluj', 'RO');
    expect(first.label).toBe('Cluj-Napoca, Cluj, Romania');
    expect(first.lat).toBeCloseTo(46.77);
    expect(first.lon).toBeCloseTo(23.59);
  });

  it('returns [] on a network error', async () => {
    (global as any).fetch = jest.fn().mockRejectedValue(new Error('offline'));
    expect(await searchPlaces('Cluj')).toEqual([]);
  });

  it('passes a supported Photon lang, mapping unsupported ones to en', async () => {
    mockFetchOnce(photonResponse);
    await searchPlaces('Cluj', undefined, undefined, 'es');
    const url = (global as any).fetch.mock.calls[0][0] as string;
    expect(url).toContain('lang=en'); // es -> en
    mockFetchOnce(photonResponse);
    await searchPlaces('Cluj', undefined, undefined, 'de');
    const url2 = (global as any).fetch.mock.calls[0][0] as string;
    expect(url2).toContain('lang=de'); // de supported
  });
});
