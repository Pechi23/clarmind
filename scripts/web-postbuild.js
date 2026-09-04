// Post-processes the Expo web export (dist/) to add PWA/mobile niceties that the
// default template omits:
//   - a web manifest (installable / "Add to Home Screen")
//   - theme-color, description, Open Graph & Twitter tags (nice link previews)
//   - Apple touch icon + standalone meta (iOS add-to-home-screen)
// No service worker on purpose — offline caching of a large JS bundle is a common
// source of stale-content bugs; this keeps installs simple and always-fresh.
//
// Run automatically by `npm run build:web`. Idempotent: re-running is a no-op.
const fs = require('fs');
const path = require('path');

const DIST = path.resolve(__dirname, '..', 'dist');
const indexPath = path.join(DIST, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('web-postbuild: dist/index.html not found — run the web export first.');
  process.exit(1);
}

const NAME = 'ClarMind';
const DESCRIPTION = 'Mindfulness, breathing meditations & daily astrology — clear your mind, every day.';
const THEME = '#0f0c29';

// 1) Copy an app icon to a stable path (relative so it works under a subpath too).
const iconSrc = path.resolve(__dirname, '..', 'assets', 'icon.png');
if (fs.existsSync(iconSrc)) {
  fs.copyFileSync(iconSrc, path.join(DIST, 'icon.png'));
}

// 2) Write the web manifest. Relative paths keep it valid at root or /<repo>/.
const manifest = {
  name: NAME,
  short_name: NAME,
  description: DESCRIPTION,
  start_url: '.',
  scope: '.',
  display: 'standalone',
  orientation: 'portrait',
  background_color: THEME,
  theme_color: THEME,
  icons: [
    { src: 'icon.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
    { src: 'icon.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
  ],
};
fs.writeFileSync(path.join(DIST, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2));

// 3) Inject head tags (once).
let html = fs.readFileSync(indexPath, 'utf8');
if (!html.includes('rel="manifest"')) {
  const tags = `
    <meta name="description" content="${DESCRIPTION}" />
    <meta name="theme-color" content="${THEME}" />
    <link rel="manifest" href="manifest.webmanifest" />
    <link rel="apple-touch-icon" href="icon.png" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="${NAME}" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${NAME}" />
    <meta property="og:description" content="${DESCRIPTION}" />
    <meta property="og:image" content="icon.png" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${NAME}" />
    <meta name="twitter:description" content="${DESCRIPTION}" />
  `;
  html = html.replace('</head>', `${tags}</head>`);
  fs.writeFileSync(indexPath, html);
  console.log('web-postbuild: injected manifest + meta tags.');
} else {
  console.log('web-postbuild: head tags already present — skipped.');
}
