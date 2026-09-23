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

## Abuse protection (recommended, since the URL is in the public web bundle)

The Worker already keeps the key server-side. To also stop strangers from
running your Gemini bill, enable the built-in guards:

1. **App key (`X-App-Key`).** Pick a random string. Set it both as a Worker
   secret and as an app env var, then rebuild:
   ```bash
   wrangler secret put APP_KEY            # in proxy/, paste the same string
   ```
   ```
   # app .env
   EXPO_PUBLIC_AI_APP_KEY=<the same random string>
   ```
   The Worker enforces it **only when the secret is set**, so deploy the Worker
   first, then ship a build that sends the header, then set the secret. The app
   sends this header automatically (see `proxyHeaders` in `src/services/ai.ts`).

2. **Per-device daily cap (Workers KV).** Enforces the 50/day quota server-side:
   ```bash
   wrangler kv namespace create RATE_KV
   ```
   Paste the printed id into the `[[kv_namespaces]]` block in `wrangler.toml`,
   then `wrangler deploy`. Skipped automatically if left unbound. Cap is
   `DAILY_CAP` in `worker.js` (80/device/day). The app sends `X-Device-Id`.

3. **CORS** is already limited to `https://pechi23.github.io` (native apps send
   no Origin and are unaffected). Update `ALLOWED_ORIGINS` in `worker.js` if the
   web app moves.

4. **Output cap.** `maxOutputTokens` is clamped to `MAX_OUTPUT_TOKENS` (2048)
   server-side for text, so a caller cannot request an expensive huge generation.

5. Optionally add a Cloudflare **Rate Limiting rule** on the Worker route in the
   dashboard (e.g. 30 requests / 10 min per IP) for a second, per-IP layer.

## ⚠️ Rotate the old key

The current key has shipped inside earlier APKs, so treat it as compromised:
create a **new** Gemini key in Google AI Studio, put *that* one in the Worker
secret, and delete/restrict the old key in the Google Cloud console.

## Further hardening (later)
- Restrict the key in Google Cloud (API restrictions → Generative Language API only).
- Add response caching for identical daily prompts to cut cost at scale.
