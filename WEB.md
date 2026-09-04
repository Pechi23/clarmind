# ClarMind on the Web

ClarMind runs as a web app too — same React Native codebase, compiled to the
browser via **React Native Web** (already wired into Expo). No separate codebase.

## Run it locally (dev)

```bash
npm run web
```

Opens a dev server (usually http://localhost:8081) with hot reload.

## Build a static site (production)

```bash
npm run build:web
```

Outputs a self-contained static site to `dist/` (HTML + JS + assets). Serve that
folder from any static host.

Quick local preview of the production build:

```bash
npx serve dist
```

## Deploy (no backend needed)

The `dist/` folder is a plain static site. Easiest options:

- **Netlify** — drag `dist/` onto https://app.netlify.com/drop (zero config, root path).
- **Vercel** — `vercel deploy dist` (or import the repo, build command `npm run build:web`, output dir `dist`).
- **GitHub Pages** — see the workflow in `.github/workflows/deploy-web.yml`. Because
  Pages serves from a subpath (`/clarmind/`), the workflow builds with a base URL so
  asset paths resolve. Enable Pages once in the repo settings (Source: GitHub Actions).

## ⚠️ Security: the Gemini API key on web

On web, `EXPO_PUBLIC_GEMINI_API_KEY` is **embedded in the JavaScript bundle in plain
text** — anyone can read it from the browser. For a *public* web deployment you MUST
route AI calls through the proxy instead of shipping the key:

1. Deploy the Cloudflare Worker in `proxy/` (holds the key server-side).
2. Set `EXPO_PUBLIC_AI_PROXY_URL` to the Worker URL and **do not** set the key.
3. Rebuild (`npm run build:web`).

`services/ai.ts` already prefers the proxy when `EXPO_PUBLIC_AI_PROXY_URL` is set and
only falls back to the direct key (fine for local dev, never for a public site).

## What differs on web vs. native

Native-only features degrade gracefully — the app never crashes on web:

| Feature | Web behavior |
|---|---|
| Date / time pickers | Browser-native `<input type="date/time">` (`components/DateTimePicker.web.tsx`) |
| Clara voice input (mic) | Uses the browser **Web Speech API** (Chrome/Edge); mic button hidden if unsupported (`services/speechRecognition.web.ts`) |
| Clara text-to-speech | Browser SpeechSynthesis (works) |
| Soundscapes / bells | HTML5 audio via expo-av (works) |
| Haptics | No-op (guarded by `Platform.OS !== 'web'`) |
| Daily notifications | No-op (expo-notifications is native-only) |
| Share progress card | Shares progress as text via the browser **Web Share API**, falling back to clipboard copy (shows ✓). The image card itself is native-only |
