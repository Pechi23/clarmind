// tz-lookup ships no types. It maps a lat/lon to an IANA time zone name
// (e.g. "Europe/Bucharest"), fully offline, and throws on out-of-range input.
declare module 'tz-lookup' {
  const tzlookup: (lat: number, lon: number) => string;
  export default tzlookup;
}
