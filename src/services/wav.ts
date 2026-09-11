// Wrap raw PCM (what Gemini TTS returns) into a playable WAV data URI, with no
// native dependency. Gemini returns base64 signed 16-bit little-endian mono PCM
// (audio/L16). We decode it, prepend a 44-byte WAV header, and re-encode so
// expo-av can play it from a data: URI. Pure and unit-tested.

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const LOOKUP: Record<string, number> = {};
for (let i = 0; i < B64.length; i++) LOOKUP[B64[i]] = i;

export const b64ToBytes = (b64: string): Uint8Array => {
  const s = b64.replace(/[^A-Za-z0-9+/]/g, ''); // drop '=' padding + whitespace
  const len = s.length;
  const out = new Uint8Array(Math.floor((len * 3) / 4));
  let p = 0;
  let i = 0;
  for (; i + 4 <= len; i += 4) {
    const n = (LOOKUP[s[i]] << 18) | (LOOKUP[s[i + 1]] << 12) | (LOOKUP[s[i + 2]] << 6) | LOOKUP[s[i + 3]];
    out[p++] = (n >> 16) & 255;
    out[p++] = (n >> 8) & 255;
    out[p++] = n & 255;
  }
  const rem = len - i;
  if (rem === 2) {
    const n = (LOOKUP[s[i]] << 18) | (LOOKUP[s[i + 1]] << 12);
    out[p++] = (n >> 16) & 255;
  } else if (rem === 3) {
    const n = (LOOKUP[s[i]] << 18) | (LOOKUP[s[i + 1]] << 12) | (LOOKUP[s[i + 2]] << 6);
    out[p++] = (n >> 16) & 255;
    out[p++] = (n >> 8) & 255;
  }
  return out.subarray(0, p);
};

export const bytesToB64 = (bytes: Uint8Array): string => {
  let out = '';
  let i = 0;
  const len = bytes.length;
  for (; i + 2 < len; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + B64[n & 63];
  }
  const rem = len - i;
  if (rem === 1) {
    const n = bytes[i] << 16;
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + '==';
  } else if (rem === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + '=';
  }
  return out;
};

export const wavHeader = (dataLen: number, sampleRate: number): Uint8Array => {
  const buf = new ArrayBuffer(44);
  const v = new DataView(buf);
  const writeStr = (off: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };
  const channels = 1;
  const bits = 16;
  const byteRate = sampleRate * channels * (bits / 8);
  writeStr(0, 'RIFF');
  v.setUint32(4, 36 + dataLen, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);          // PCM
  v.setUint16(22, channels, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, byteRate, true);
  v.setUint16(32, channels * (bits / 8), true);
  v.setUint16(34, bits, true);
  writeStr(36, 'data');
  v.setUint32(40, dataLen, true);
  return new Uint8Array(buf);
};

/** base64 PCM16 mono -> a `data:audio/wav;base64,...` URI expo-av can play. */
export const wavDataUri = (pcmB64: string, sampleRate = 24000): string => {
  const pcm = b64ToBytes(pcmB64);
  const header = wavHeader(pcm.length, sampleRate);
  const full = new Uint8Array(header.length + pcm.length);
  full.set(header, 0);
  full.set(pcm, header.length);
  return 'data:audio/wav;base64,' + bytesToB64(full);
};
