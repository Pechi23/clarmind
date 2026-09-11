import { b64ToBytes, bytesToB64, wavHeader, wavDataUri } from '../wav';

describe('base64 round-trip', () => {
  it('encodes and decodes arbitrary bytes', () => {
    for (const arr of [[0], [1, 2, 3], [255, 0, 128, 64], [10, 20, 30, 40, 50]]) {
      const bytes = new Uint8Array(arr);
      expect(Array.from(b64ToBytes(bytesToB64(bytes)))).toEqual(arr);
    }
  });
});

describe('wavHeader', () => {
  it('starts with RIFF and contains WAVE + data', () => {
    const h = wavHeader(100, 24000);
    const str = String.fromCharCode(...h);
    expect(h.length).toBe(44);
    expect(str.slice(0, 4)).toBe('RIFF');
    expect(str.slice(8, 12)).toBe('WAVE');
    expect(str.slice(36, 40)).toBe('data');
    // sample rate 24000 little-endian at offset 24
    expect(h[24] | (h[25] << 8) | (h[26] << 16) | (h[27] << 24)).toBe(24000);
  });
});

describe('wavDataUri', () => {
  it('produces a WAV data URI from base64 PCM', () => {
    const pcm = bytesToB64(new Uint8Array([1, 2, 3, 4]));
    const uri = wavDataUri(pcm, 24000);
    expect(uri.startsWith('data:audio/wav;base64,')).toBe(true);
    // decoded payload = 44-byte header + 4 PCM bytes
    const decoded = b64ToBytes(uri.split(',')[1]);
    expect(decoded.length).toBe(48);
    expect(String.fromCharCode(...decoded.subarray(0, 4))).toBe('RIFF');
  });
});
