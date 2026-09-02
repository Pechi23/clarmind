# ClarMind AI proxy (Cloudflare Worker)

Keeps the Gemini API key **off the device**. Instead of the app calling Gemini
directly with a bundled key (extractable from the APK), the app calls this
Worker, which holds the key as a server-side secret and forwards the request.

Cloudflare Workers' free tier (100k requests/day) is plenty for this.

## Deploy (one time)

1. Install the CLI and log in (uses your Cloudflare account — free to create):
   ```bash
   npm i -g wrangler
   wrangler login
   ```
2. From this `proxy/` folder, store the Gemini key as a secret (paste it when prompted):
   ```bash
   wrangler secret put GEMINI_API_KEY
   ```
3. Deploy:
   ```bash
   wrangler deploy
   ```
   Copy the printed URL, e.g. `https://clarmind-ai-proxy.<your-subdomain>.workers.dev`.

## Point the app at the proxy

In the app's `.env`:
```
EXPO_PUBLIC_AI_PROXY_URL=https://clarmind-ai-proxy.<your-subdomain>.workers.dev
```
Then **remove** `EXPO_PUBLIC_GEMINI_API_KEY` from `.env` and rebuild. The app's
`src/services/ai.ts` gateway automatically uses the proxy when the URL is set, so
the key is no longer in the bundle.

## ⚠️ Rotate the old key

The current key has shipped inside earlier APKs, so treat it as compromised:
create a **new** Gemini key in Google AI Studio, put *that* one in the Worker
secret, and delete/restrict the old key in the Google Cloud console.

## Optional hardening (later)
- Restrict the key in Google Cloud (API restrictions → Generative Language API only).
- Add a shared-secret header the app sends and the Worker checks, to stop random
  callers using your proxy.
- Add response caching for identical daily prompts to cut cost at scale.
