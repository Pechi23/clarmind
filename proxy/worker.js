// ClarMind AI proxy — Cloudflare Worker.
//
// Holds the Gemini API key as a server-side secret so it never ships inside the
// app. The app POSTs a Gemini generateContent body here; the Worker forwards it
// to Gemini with the key attached, and returns the response verbatim.
//
// Deploy: see README.md. Set the secret with `wrangler secret put GEMINI_API_KEY`.

const MODEL = 'gemini-3.6-flash';
const GEMINI = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const MAX_BODY = 24_000; // bytes — our largest prompt is well under this

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors() });
    }
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }
    if (!env.GEMINI_API_KEY) {
      return json({ error: 'Proxy misconfigured: missing GEMINI_API_KEY secret' }, 500);
    }

    const body = await request.text();
    if (body.length > MAX_BODY) return json({ error: 'Payload too large' }, 413);
    try {
      JSON.parse(body); // reject anything that isn't a JSON request body
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    const res = await fetch(`${GEMINI}?key=${env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { 'Content-Type': 'application/json', ...cors() },
    });
  },
};

const cors = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
});

const json = (obj, status) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors() },
  });
