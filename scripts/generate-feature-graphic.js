/**
 * Generates the Google Play feature graphic (1024x500) from inline SVG using
 * sharp. Same brand language as the app icon/splash: deep-space violet gradient,
 * a glowing crescent moon over a small constellation, the Stillnova wordmark and
 * tagline. Vector, on-brand, not an AI-looking raster.
 *
 * Run: node scripts/generate-feature-graphic.js
 */
const sharp = require('sharp');
const path = require('path');

const W = 1024, H = 500;
const ASSETS = path.join(__dirname, '..', 'assets');

const defs = `
  <defs>
    <radialGradient id="bg" cx="62%" cy="40%" r="85%">
      <stop offset="0%" stop-color="#2a1a5e"/>
      <stop offset="55%" stop-color="#1a1a3e"/>
      <stop offset="100%" stop-color="#0f0c29"/>
    </radialGradient>
    <linearGradient id="moon" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e9d5ff"/>
      <stop offset="60%" stop-color="#a78bfa"/>
      <stop offset="100%" stop-color="#7c3aed"/>
    </linearGradient>
    <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#a78bfa" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#a78bfa" stop-opacity="0"/>
    </radialGradient>
  </defs>`;

/** Crescent moon at (cx,cy) radius r + a small constellation. */
function mark(cx, cy, r) {
  const offset = r * 0.42;
  return `
    <circle cx="${cx}" cy="${cy}" r="${r * 1.6}" fill="url(#moonGlow)"/>
    <mask id="crescent">
      <rect width="100%" height="100%" fill="black"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="white"/>
      <circle cx="${cx + offset}" cy="${cy - offset * 0.5}" r="${r * 0.92}" fill="black"/>
    </mask>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#moon)" mask="url(#crescent)"/>
    <g stroke="#c4b5fd" stroke-width="${r * 0.028}" opacity="0.85">
      <line x1="${cx + r * 0.55}" y1="${cy + r * 0.85}" x2="${cx + r * 0.95}" y2="${cy + r * 1.15}"/>
      <line x1="${cx + r * 0.95}" y1="${cy + r * 1.15}" x2="${cx + r * 1.25}" y2="${cy + r * 0.88}"/>
    </g>
    <g fill="#e9d5ff">
      <circle cx="${cx + r * 0.55}" cy="${cy + r * 0.85}" r="${r * 0.05}"/>
      <circle cx="${cx + r * 0.95}" cy="${cy + r * 1.15}" r="${r * 0.065}"/>
      <circle cx="${cx + r * 1.25}" cy="${cy + r * 0.88}" r="${r * 0.045}"/>
    </g>`;
}

/** Scattered ambient stars (seeded for a consistent, tasteful layout). */
function stars(n, seed = 11) {
  let s = seed;
  const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  let out = '<g fill="#f1f5f9">';
  for (let i = 0; i < n; i++) {
    const x = rand() * W, y = rand() * H;
    const r = 0.8 + rand() * 2.2;
    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" opacity="${(0.2 + rand() * 0.5).toFixed(2)}"/>`;
  }
  return out + '</g>';
}

const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  ${defs}
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  ${stars(46)}
  ${mark(812, 250, 132)}
  <text x="80" y="232" font-family="Arial, Helvetica, sans-serif" font-size="104" font-weight="700"
    fill="#f1f5f9" letter-spacing="1">Stillnova</text>
  <text x="84" y="292" font-family="Arial, Helvetica, sans-serif" font-size="40" font-weight="600"
    fill="#a78bfa" letter-spacing="2">find your calm</text>
  <text x="85" y="340" font-family="Arial, Helvetica, sans-serif" font-size="25"
    fill="#c4b5fd" opacity="0.9">Mindfulness, breathing and daily astrology</text>
</svg>`;

(async () => {
  const out = path.join(ASSETS, 'feature-graphic.png');
  await sharp(Buffer.from(svg)).resize(W, H).png().toFile(out);
  console.log(`Feature graphic written: ${out} (${W}x${H})`);
})().catch((e) => { console.error(e); process.exit(1); });
