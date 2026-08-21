/**
 * Generates calming, seamlessly-looping ambient WAV soundscapes procedurally.
 * Run: node scripts/generate-sounds.js
 *
 * No external audio assets or ffmpeg required. Mono, 22050 Hz, 16-bit PCM,
 * ~15s loops with an equal-power crossfade so they loop without a seam.
 */
const fs = require('fs');
const path = require('path');

const SR = 22050;
const SECONDS = 15;
const CROSSFADE = 1.2; // seconds blended across the loop point
const OUT = path.join(__dirname, '..', 'assets', 'sounds');

// ---- helpers ----------------------------------------------------------------

function writeWav(filename, samples) {
  const n = samples.length;
  const buffer = Buffer.alloc(44 + n * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + n * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);      // PCM
  buffer.writeUInt16LE(1, 22);      // mono
  buffer.writeUInt32LE(SR, 24);
  buffer.writeUInt32LE(SR * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32);      // block align
  buffer.writeUInt16LE(16, 34);     // bits
  buffer.write('data', 36);
  buffer.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    let s = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE((s * 32767) | 0, 44 + i * 2);
  }
  fs.writeFileSync(path.join(OUT, filename), buffer);
  console.log(`✓ ${filename} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
}

/** Blend the tail into the head so the loop is seamless (equal-power). */
function crossfadeLoop(raw, totalLen) {
  const cf = Math.floor(CROSSFADE * SR);
  const out = new Float32Array(totalLen);
  for (let i = 0; i < totalLen; i++) out[i] = raw[i];
  for (let i = 0; i < cf; i++) {
    const t = i / cf;
    const a = Math.cos((t * Math.PI) / 2); // fade out tail
    const b = Math.sin((t * Math.PI) / 2); // fade in head-continuation
    out[i] = raw[i] * b + raw[totalLen + i] * a;
  }
  return out;
}

function normalize(buf, peak = 0.9) {
  let max = 0;
  for (let i = 0; i < buf.length; i++) max = Math.max(max, Math.abs(buf[i]));
  if (max === 0) return buf;
  const g = peak / max;
  for (let i = 0; i < buf.length; i++) buf[i] *= g;
  return buf;
}

// Deterministic noise so builds are reproducible.
let seed = 1337;
const rand = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return (seed / 0x7fffffff) * 2 - 1;
};

// One-pole low-pass
function lowpass(input, alpha) {
  const out = new Float32Array(input.length);
  let y = 0;
  for (let i = 0; i < input.length; i++) { y += alpha * (input[i] - y); out[i] = y; }
  return out;
}
function highpass(input, alpha) {
  const out = new Float32Array(input.length);
  let prevIn = 0, prevOut = 0;
  for (let i = 0; i < input.length; i++) {
    prevOut = alpha * (prevOut + input[i] - prevIn);
    prevIn = input[i];
    out[i] = prevOut;
  }
  return out;
}

function brown(len) {
  const out = new Float32Array(len);
  let y = 0;
  for (let i = 0; i < len; i++) { y = (y + 0.02 * rand()) * 0.998; out[i] = y; }
  return normalize(out, 1);
}

// ---- soundscapes ------------------------------------------------------------

const N = SECONDS * SR;
const GEN = N + Math.floor(CROSSFADE * SR); // extra tail for crossfade

function rain() {
  let s = brown(GEN);
  s = highpass(s, 0.55);                 // hiss
  const lp = lowpass(s, 0.5);
  const out = new Float32Array(GEN);
  for (let i = 0; i < GEN; i++) out[i] = s[i] * 0.6 + lp[i] * 0.4;
  return normalize(crossfadeLoop(out, N), 0.7);
}

function ocean() {
  const b = brown(GEN);
  const s = lowpass(b, 0.08);            // deep rumble
  const out = new Float32Array(GEN);
  for (let i = 0; i < GEN; i++) {
    const swell = 0.5 + 0.5 * Math.sin((2 * Math.PI * i) / SR * 0.09); // ~11s waves
    out[i] = s[i] * (0.35 + 0.65 * swell);
  }
  return normalize(crossfadeLoop(out, N), 0.8);
}

function forest() {
  const b = brown(GEN);
  const wind = lowpass(b, 0.05);
  const out = new Float32Array(GEN);
  for (let i = 0; i < GEN; i++) {
    const gust = 0.6 + 0.4 * Math.sin((2 * Math.PI * i) / SR * 0.05);
    out[i] = wind[i] * gust * 0.8;
  }
  return normalize(crossfadeLoop(out, N), 0.6);
}

function space() {
  const out = new Float32Array(GEN);
  const drones = [55, 82.5, 110]; // A1, E2, A2 — calm perfect-fifth pad
  for (let i = 0; i < GEN; i++) {
    const t = i / SR;
    let v = 0;
    for (let d = 0; d < drones.length; d++) {
      const lfo = 0.5 + 0.5 * Math.sin(2 * Math.PI * (0.03 + d * 0.017) * t);
      v += Math.sin(2 * Math.PI * drones[d] * t) * lfo * (1 / (d + 1.5));
    }
    out[i] = v * 0.4;
  }
  // Whisper of noise for texture
  const noise = lowpass(brown(GEN), 0.03);
  for (let i = 0; i < GEN; i++) out[i] += noise[i] * 0.15;
  return normalize(crossfadeLoop(out, N), 0.75);
}

// ---- render -----------------------------------------------------------------

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
writeWav('rain.wav', rain());
writeWav('ocean.wav', ocean());
writeWav('forest.wav', forest());
writeWav('space.wav', space());
console.log('\nAmbient soundscapes generated in assets/sounds/.');
