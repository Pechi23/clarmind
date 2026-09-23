// Stillnova AI proxy — Cloudflare Worker.
//
// Holds the Gemini API key as a server-side secret so it never ships inside the
// app. The app POSTs a Gemini generateContent body here; the Worker forwards it
// to Gemini with the key attached, and returns the response verbatim.
//
// Abuse protection (the URL is discoverable in the public web bundle):
//   - X-App-Key: a shared secret baked into the app. Enforced only when the
//     APP_KEY secret is set, so you can deploy this first and turn the lock on
//     once a build that sends the header is live.
//   - CORS is limited to the web app's origin; native apps send no Origin and
//     pass. A random website therefore cannot read a response in a browser.
//   - Per-device daily cap in Workers KV (bind RATE_KV to enable; skipped if
//     unbound), so the quota is enforced server-side, not just in the client.
//   - maxOutputTokens is clamped server-side so a caller cannot request a huge
//     (expensive) generation.
//
// Deploy: see README.md.
//   wrangler secret put GEMINI_API_KEY      (required)
//   wrangler secret put APP_KEY             (optional but recommended)
//   wrangler kv namespace create RATE_KV    (optional; then bind it in wrangler.toml)

const MODEL = 'gemini-3.6-flash';
const TTS_MODEL = 'gemini-2.5-flash-preview-tts'; // neural text-to-speech
const url = (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const MAX_BODY = 24_000;       // bytes; our largest prompt is well under this
const MAX_OUTPUT_TOKENS = 2048; // server-side ceiling for text generations
const DAILY_CAP = 80;           // AI requests per device per day (>= premium quota + slack)
const ALLOWED_ORIGINS = ['https://pechi23.github.io'];

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors(request) });
    }
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, request);
    }
    if (!env.GEMINI_API_KEY) {
      return json({ error: 'Proxy misconfigured: missing GEMINI_API_KEY secret' }, 500, request);
    }

    // App-key gate (obfuscation, not strong auth). Only enforced once configured,
    // so deploying before the app ships the header does not lock out real users.
    if (env.APP_KEY && request.headers.get('X-App-Key') !== env.APP_KEY) {
      return json({ error: 'Unauthorized' }, 401, request);
    }

    const raw = await request.text();
    if (raw.length > MAX_BODY) return json({ error: 'Payload too large' }, 413, request);

    let payload;
    try {
      payload = JSON.parse(raw); // reject anything that isn't a JSON request body
    } catch {
      return json({ error: 'Invalid JSON body' }, 400, request);
    }

    // ?mode=tts routes to the text-to-speech model; everything else is text.
    const isTts = new URL(request.url).searchParams.get('mode') === 'tts';

    // Per-device daily cap (server-side quota). Soft limit; KV is eventually
    // consistent, which is fine for cost protection. Skipped when RATE_KV is
    // unbound so the proxy still works before the namespace exists.
    if (env.RATE_KV) {
      const device = (request.headers.get('X-Device-Id') || 'anon').slice(0, 64);
      const key = `rl:${device}:${new Date().toISOString().slice(0, 10)}`;
      const used = parseInt((await env.RATE_KV.get(key)) || '0', 10) || 0;
      if (used >= DAILY_CAP) {
        return json({ error: 'Daily AI limit reached. Try again tomorrow.' }, 429, request);
      }
      // ~2-day TTL so day-boundary keys expire on their own.
      await env.RATE_KV.put(key, String(used + 1), { expirationTtl: 172_800 });
    }

    // Clamp the output size for text generations so nobody can request a huge one.
    if (!isTts) {
      const gc = (payload.generationConfig && typeof payload.generationConfig === 'object')
        ? payload.generationConfig : {};
      const requested = typeof gc.maxOutputTokens === 'number' ? gc.maxOutputTokens : MAX_OUTPUT_TOKENS;
      gc.maxOutputTokens = Math.min(requested, MAX_OUTPUT_TOKENS);
      payload.generationConfig = gc;
    }

    const target = url(isTts ? TTS_MODEL : MODEL);
    const res = await fetch(`${target}?key=${env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { 'Content-Type': 'application/json', ...cors(request) },
    });
  },
};

// Only expose CORS to the web app's origin. Native requests carry no Origin
// header and do not need CORS at all, so they are unaffected.
const cors = (request) => {
  const origin = request.headers.get('Origin');
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-App-Key, X-Device-Id',
    'Vary': 'Origin',
  };
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
};

const json = (obj, status, request) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors(request) },
  });
