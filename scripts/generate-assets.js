/**
 * Generates ClarMind's app icons and splash from inline SVG using sharp.
 * Run: node scripts/generate-assets.js
 *
 * On-brand mark: a glowing crescent moon over a small constellation on the
 * signature deep-space violet gradient — echoing the in-app Constellation Sky.
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ASSETS = path.join(__dirname, '..', 'assets');

// ---- SVG building blocks ----------------------------------------------------

const bgGradient = `
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="75%">
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
      <stop offset="0%" stop-color="#a78bfa" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#a78bfa" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#f1f5f9" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#f1f5f9" stop-opacity="0"/>
    </radialGradient>
  </defs>`;

/** A crescent moon centred at (cx,cy) with outer radius r, plus a small constellation. */
function mark(cx, cy, r, showConstellation = true) {
  // Crescent: big disc minus an offset disc.
  const offset = r * 0.42;
  const constellation = showConstellation ? `
    <g stroke="#c4b5fd" stroke-width="${r * 0.03}" opacity="0.85">
      <line x1="${cx + r * 0.55}" y1="${cy + r * 0.75}" x2="${cx + r * 0.95}" y2="${cy + r * 1.05}"/>
      <line x1="${cx + r * 0.95}" y1="${cy + r * 1.05}" x2="${cx + r * 1.25}" y2="${cy + r * 0.78}"/>
    </g>
    <g fill="#e9d5ff">
      <circle cx="${cx + r * 0.55}" cy="${cy + r * 0.75}" r="${r * 0.055}"/>
      <circle cx="${cx + r * 0.95}" cy="${cy + r * 1.05}" r="${r * 0.07}"/>
      <circle cx="${cx + r * 1.25}" cy="${cy + r * 0.78}" r="${r * 0.05}"/>
    </g>` : '';
  return `
    <circle cx="${cx}" cy="${cy}" r="${r * 1.5}" fill="url(#moonGlow)"/>
    <mask id="crescent">
      <rect width="100%" height="100%" fill="black"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="white"/>
      <circle cx="${cx + offset}" cy="${cy - offset * 0.5}" r="${r * 0.92}" fill="black"/>
    </mask>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#moon)" mask="url(#crescent)"/>
    ${constellation}`;
}

/** Scattered ambient stars for larger canvases. */
function ambientStars(w, h, n, seed = 7) {
  let s = seed;
  const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  let out = '<g fill="#f1f5f9">';
  for (let i = 0; i < n; i++) {
    const x = rand() * w, y = rand() * h * 0.85;
    const r = 1 + rand() * 2.5;
    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" opacity="${(0.25 + rand() * 0.5).toFixed(2)}"/>`;
  }
  return out + '</g>';
}

// ---- Compositions -----------------------------------------------------------

// App icon (square, full-bleed)
function iconSvg(size) {
  const c = size / 2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    ${bgGradient}
    <rect width="${size}" height="${size}" fill="url(#bg)"/>
    ${ambientStars(size, size, 28)}
    ${mark(c * 0.92, c * 0.86, size * 0.24)}
  </svg>`;
}

// Adaptive icon (Android) — safe zone is the centre 66%, so shrink the mark.
function adaptiveSvg(size) {
  const c = size / 2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    ${bgGradient}
    <rect width="${size}" height="${size}" fill="url(#bg)"/>
    ${mark(c, c * 0.92, size * 0.18)}
  </svg>`;
}

// Splash icon — transparent bg, just the mark + wordmark (Expo tints the bg).
function splashSvg(size) {
  const c = size / 2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    ${bgGradient}
    ${mark(c, c * 0.82, size * 0.16)}
    <text x="${c}" y="${c * 1.35}" font-family="Arial, sans-serif" font-size="${size * 0.075}"
      font-weight="700" fill="#f1f5f9" text-anchor="middle" letter-spacing="${size * 0.006}">ClarMind</text>
    <text x="${c}" y="${c * 1.44}" font-family="Arial, sans-serif" font-size="${size * 0.032}"
      fill="#a78bfa" text-anchor="middle" letter-spacing="${size * 0.004}">clear your mind</text>
  </svg>`;
}

// ---- Render -----------------------------------------------------------------

async function render(svg, filename, size) {
  const out = path.join(ASSETS, filename);
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(out);
  console.log(`✓ ${filename} (${size}x${size})`);
}

(async () => {
  if (!fs.existsSync(ASSETS)) fs.mkdirSync(ASSETS, { recursive: true });
  await render(iconSvg(1024), 'icon.png', 1024);
  await render(adaptiveSvg(1024), 'adaptive-icon.png', 1024);
  await render(splashSvg(1024), 'splash-icon.png', 1024);
  await render(iconSvg(48), 'favicon.png', 48);
  // A 512 store icon for Play Console listing.
  await render(iconSvg(512), 'store-icon-512.png', 512);
  console.log('\nAll assets generated in assets/.');
})().catch((e) => { console.error(e); process.exit(1); });
